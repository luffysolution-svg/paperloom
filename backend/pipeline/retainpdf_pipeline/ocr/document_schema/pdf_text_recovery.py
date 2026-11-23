"""Recover corrupted OCR text from a matching embedded PDF text layer."""
from __future__ import annotations

from difflib import SequenceMatcher
import re
import unicodedata


_GREEK = dict(zip(
    'αβγδεζηθικλμνξοπρστυφχψω',
    ('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi '
     'omicron pi rho sigma tau upsilon phi chi psi omega').split(),
))
_SYMBOLS = {'∈': r'\in ', '≤': r'\le ', '≥': r'\ge ', '∞': r'\infty ', '×': r'\times ', '⋅': r'\cdot '}


def _math_char(char: str) -> bool:
    return 0x1D400 <= ord(char) <= 0x1D7FF or char in _GREEK or char in _SYMBOLS


def _tex(text: str) -> str:
    return ''.join(('\\' + _GREEK[c] + ' ') if c in _GREEK else _SYMBOLS.get(c, c)
                   for c in unicodedata.normalize('NFKC', text))


def _line_text(line: dict) -> str:
    chunks, math = [], []
    baseline = size = 0.0

    def flush() -> None:
        if math:
            chunks.append('$' + ''.join(math).strip() + '$')
            math.clear()

    for span in line['spans']:
        text = span['text']
        # Mathematical spans can include punctuation, digits and subscripts.
        is_math = any(_math_char(c) for c in text)
        continuation = bool(math) and bool(re.fullmatch(r'[\d\s(),.\[\]+=−\-]+|[A-Z]{1,3}', text)) and bool(text.strip())
        if is_math or continuation:
            lowered = (math and span['size'] < size * 0.85
                       and span['origin'][1] > baseline + size * 0.1)
            raised = (math and span['size'] < size * 0.85
                      and span['origin'][1] < baseline - size * 0.1)
            if lowered or raised:
                math.append(('_{' if lowered else '^{') + _tex(text) + '}')
            else:
                math.append(_tex(text))
                if is_math:
                    baseline, size = span['origin'][1], span['size']
        else:
            flush()
            chunks.append(text)
    flush()
    return ''.join(chunks).strip()


def _set_recovered_text(block: dict, text: str) -> None:
    block["text"] = text
    if "content" in block:
        block["content"]["text"] = text


def _recover_prose_gaps(block: dict, original: str, native: str) -> bool:
    """Replace the damaged runs only. Keep the OCR equation spans on either side."""
    gaps = list(re.finditer(r'\ufffd+', original))
    changes = []
    for gap in gaps:
        left = ''.join(original[:gap.start()].split())[-4:]
        right = ''.join(original[gap.end():].split())[:4]
        if len(left) < 3 or len(right) < 3:
            return False
        candidates = re.findall(re.escape(left) + '(.{1,32}?)' + re.escape(right), native)
        if len(candidates) != 1 or '\ufffd' in candidates[0]:
            return False
        changes.append(dict(before=left, old=gap.group(), after=right, value=candidates[0]))

    replacements = [entry['value'] for entry in changes]

    def replace_parts(parts: list[str]) -> list[str]:
        if sum(len(re.findall(r'\ufffd+', part)) for part in parts) != len(changes):
            return parts
        values = iter(replacements)
        return [re.sub(r'\ufffd+', lambda _: next(values), part) for part in parts]

    _set_recovered_text(block, replace_parts([original])[0])
    for spans in (block.get('segments', []),
                  [s for line in block.get('lines', []) for s in line.get('spans', [])]):
        for span, text in zip(spans, replace_parts([s.get('text', '') for s in spans])):
            span['text'] = text
    content = block.get('content', {})
    if content.get('line_texts'):
        content['line_texts'] = replace_parts(content['line_texts'])
    block.setdefault('metadata', {}).update(pdf_text_recovered=True, pdf_text_replacements=changes)
    return True


def recover_corrupted_pdf_text(document: dict, pdf) -> int:
    """Repair only replacement-character blocks with a close text-layer match.

    Image-only pages and unrelated text-layer regions keep the provider text.
    Coordinates must already have been converted to PDF points.
    """
    import fitz

    repaired = 0
    for page_index, page in enumerate(document.get('pages', [])):
        if page_index >= len(pdf):
            break
        for block in page.get('blocks', []):
            original = block.get('text', '')
            if '\ufffd' not in original:
                continue
            region = fitz.Rect(block['bbox']) + (-1, -1, 1, 1)
            embedded = pdf[page_index].get_text('dict', clip=region)
            lines = [line for b in embedded['blocks'] for line in b.get('lines', [])]
            plain = ' '.join(''.join(s['text'] for s in line['spans']) for line in lines)
            compact = lambda value: ''.join(value.split())
            # A short formula may lose most of its symbols; require all of its
            # remaining punctuation/operators to match the embedded expression.
            original_compact = compact(original)
            known = original_compact.replace('\ufffd', '')
            damaged_pattern = '.+?'.join(re.escape(part) for part in re.split('\ufffd+', original_compact))
            formula_match = len(known) >= 8 and re.fullmatch(damaged_pattern, compact(plain)) is not None
            if not formula_match and '=' in known and original_compact.count('\ufffd') > len(original_compact) / 2:
                # OCR may drop a terminal subscript as well as replace symbols.
                formula_match = len(known) >= 8 and re.fullmatch(
                    damaged_pattern + r'[A-Za-z0-9]{0,3}',
                    unicodedata.normalize('NFKC', compact(plain)),
                ) is not None
            if plain and _recover_prose_gaps(block, original, compact(plain)):
                repaired += 1
                continue
            if any(s.get('type') == 'inline_formula' for s in block.get('segments', [])):
                continue
            close_text = SequenceMatcher(None, original_compact, compact(plain), autojunk=False).ratio() >= 0.8
            if not plain or '\ufffd' in plain or not (close_text or formula_match):
                continue
            restored_lines = [_line_text(line) for line in lines]
            _set_recovered_text(block, ' '.join(restored_lines))
            block['lines'] = [dict(bbox=list(line['bbox']), spans=[dict(
                type='text', text=text, bbox=list(line['bbox']), score=1.0)])
                for line, text in zip(lines, restored_lines)]
            block.setdefault('metadata', {})['pdf_text_recovered'] = True
            repaired += 1
    return repaired


_PROSE_TOKEN = re.compile(r"[^\W\d_]+|\d+(?:[.,]\d+)*")


def _integer_contexts(tokens: list[str]) -> dict[tuple[str, ...], list[str]]:
    contexts: dict[tuple[str, ...], list[str]] = {}
    for index in range(3, len(tokens) - 3):
        value = tokens[index]
        if value.isdecimal() and len(value) >= 2:
            context = tuple(tokens[index - 3:index] + tokens[index + 1:index + 4])
            contexts.setdefault(context, []).append(value)
    return contexts


def recover_dropped_pdf_digits(document: dict, pdf) -> int:
    """Recover a missing digit when the PDF has a unique matching six-token context."""
    import fitz

    repaired = 0
    for page, pdf_page in zip(document.get("pages", []), pdf):
        for block in page.get("blocks", []):
            text = block.get("text", "")
            if block.get("sub_type") != "body" or "$" in text or not re.search(r"\d{2}", text):
                continue
            tokens = _PROSE_TOKEN.findall(text)
            contexts = _integer_contexts(tokens)
            if not contexts:
                continue
            # The OCR box sometimes ends just before the missing digit at a line end.
            region = fitz.Rect(block["bbox"]) + (-2, -2, 8, 2)
            native = _integer_contexts(_PROSE_TOKEN.findall(pdf_page.get_text(clip=region)))
            replacements = {}
            spans = [span for line in block.get("lines", []) for span in line.get("spans", [])]
            for context, values in contexts.items():
                candidates = native.get(context, [])
                if len(values) != 1 or len(candidates) != 1:
                    continue
                old, new = values[0], candidates[0]
                if len(new) != len(old) + 1 or tokens.count(old) != 1:
                    continue
                if spans and sum(_PROSE_TOKEN.findall(span.get("text", "")).count(old) for span in spans) != 1:
                    continue
                if any(new[:i] + new[i + 1:] == old for i in range(len(new))):
                    replacements[old] = new
            if replacements:
                def replace(match):
                    return replacements.get(match.group(), match.group())
                _set_recovered_text(block, _PROSE_TOKEN.sub(replace, text))
                for span in spans:
                    if "text" in span:
                        span["text"] = _PROSE_TOKEN.sub(replace, span["text"])
                block.setdefault("metadata", {})["pdf_text_digit_recovery"] = replacements
                repaired += len(replacements)
    return repaired
