from __future__ import annotations

import re


# These commands can otherwise decode as JSON's legal b/f/n/r/t escapes.
# In particular, arbitrary lowercase prose after \n or \t is not evidence.
_MATH_CONTROL_COMMANDS = {
    "beta", "boldsymbol", "bar", "boxed", "binom", "big", "bigl", "bigr", "begin", "bmatrix",
    "frac", "forall", "nu", "nabla", "neq", "notin", "rho", "right",
    "rightarrow", "rangle", "theta", "tau", "times", "to", "tfrac", "text", "textbf", "textit",
}
_COMMAND_RE = re.compile(r"[A-Za-z]+")
_JSON_STRING_RE = re.compile(r'"((?:\\.|[^"\\])*)"', re.DOTALL)
_MATH_SPAN_RE = re.compile(r"(?<!\\)\$\$.*?(?<!\\)\$\$|(?<!\\)\$[^$]*?(?<!\\)\$|\\\(.*?\\\)|\\\[.*?\\\]", re.DOTALL)
_CONTROL_PREFIXES = {"\b": "b", "\f": "f", "\n": "n", "\r": "r", "\t": "t"}


def repair_json_math_escapes(text: str) -> str:
    """Double raw LaTeX backslashes in JSON strings without decoding valid escapes."""
    math_spans = [
        (value.start(1) + span.start(), value.start(1) + span.end())
        for value in _JSON_STRING_RE.finditer(text)
        for span in _MATH_SPAN_RE.finditer(value.group(1))
    ]
    result: list[str] = []
    in_string = False
    index = 0
    while index < len(text):
        char = text[index]
        if char == '"':
            in_string = not in_string
        if in_string and char == "\\" and index + 1 < len(text):
            following = text[index + 1]
            match = _COMMAND_RE.match(text, index + 1)
            command = match.group() if match else ""
            latex_u_command = following == "u" and len(command) > 1 and not re.match(r"u[0-9A-Fa-f]{4}", text[index + 1:])
            math_control = command in _MATH_CONTROL_COMMANDS and any(start <= index < end for start, end in math_spans)
            if following not in '"\\/bfnrtu' or math_control or latex_u_command:
                result.append("\\")
            # Copy the escaped character together so escaped quotes/backslashes
            # cannot change string state or be repaired a second time.
            result.append(text[index:index + 2])
            index += 2
            continue
        result.append(char)
        index += 1
    return "".join(result)


def has_corrupted_math_controls(text: str) -> bool:
    # Backspace/form-feed are not useful in guidance prose. Newline, tab and
    # carriage return remain valid unless a math span reveals a damaged command.
    if "\b" in text or "\f" in text:
        return True
    for span in _MATH_SPAN_RE.finditer(text):
        value = span.group()
        for index, char in enumerate(value):
            prefix = _CONTROL_PREFIXES.get(char)
            if prefix is None:
                continue
            match = _COMMAND_RE.match(value, index + 1)
            if match and prefix + match.group() in _MATH_CONTROL_COMMANDS:
                return True
    return False
