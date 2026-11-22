"""Small, dependency-free scholarly search adapters used by the MCP bridge."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


PROVIDERS = ("openalex", "crossref", "semantic_scholar", "europe_pmc")


def _request_json(url: str, *, headers: dict[str, str] | None = None) -> Any:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "PaperLoom/0.4.0", **(headers or {})},
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _clean_doi(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    value = re.sub(r"^https?://doi\.org/", "", value)
    return value or None


def _authors(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    names: list[str] = []
    for author in value:
        if isinstance(author, str):
            name = author.strip()
        elif isinstance(author, dict):
            name = str(author.get("name") or author.get("display_name") or author.get("given") or "").strip()
        else:
            name = ""
        if name:
            names.append(name)
    return names


def _record(*, provider: str, title: Any, authors: Any = None, year: Any = None, doi: Any = None, abstract: Any = None, url: Any = None, venue: Any = None, raw: Any = None) -> dict[str, Any]:
    return {
        "provider": provider,
        "title": str(title or "").strip(),
        "authors": _authors(authors),
        "year": int(year) if isinstance(year, int) else None,
        "doi": _clean_doi(doi),
        "abstract": str(abstract).strip() if isinstance(abstract, str) and abstract.strip() else None,
        "url": str(url).strip() if isinstance(url, str) and url.strip() else None,
        "venue": str(venue).strip() if isinstance(venue, str) and venue.strip() else None,
        "raw": raw,
    }


def _openalex(query: str, limit: int) -> list[dict[str, Any]]:
    params = {"search": query, "per-page": str(limit)}
    api_key = os.environ.get("OPENALEX_API_KEY") or os.environ.get("OMNISCHOLAR_OPENALEX_API_KEY")
    if api_key:
        params["api_key"] = api_key
    data = _request_json("https://api.openalex.org/works?" + urllib.parse.urlencode(params))
    return [_record(provider="openalex", title=item.get("title"), authors=[(a.get("author") or {}) for a in item.get("authorships", [])], year=item.get("publication_year"), doi=item.get("doi"), abstract=None, url=item.get("id"), venue=(item.get("primary_location") or {}).get("source", {}).get("display_name"), raw=item) for item in data.get("results", [])]


def _crossref(query: str, limit: int) -> list[dict[str, Any]]:
    params = {"query.bibliographic": query, "rows": str(limit), "select": "DOI,title,author,published,container-title,URL"}
    email = os.environ.get("CROSSREF_EMAIL")
    headers = {"User-Agent": f"PaperLoom/0.4.0 (mailto:{email})"} if email else None
    data = _request_json("https://api.crossref.org/works?" + urllib.parse.urlencode(params), headers=headers)
    records: list[dict[str, Any]] = []
    for item in (data.get("message") or {}).get("items", []):
        published = item.get("published-print") or item.get("published-online") or item.get("published") or {}
        parts = published.get("date-parts") or []
        year = parts[0][0] if parts and parts[0] else None
        records.append(_record(provider="crossref", title=(item.get("title") or [""])[0], authors=item.get("author"), year=year, doi=item.get("DOI"), url=item.get("URL"), venue=(item.get("container-title") or [""])[0], raw=item))
    return records


def _semantic_scholar(query: str, limit: int) -> list[dict[str, Any]]:
    params = {"query": query, "limit": str(limit), "fields": "title,authors,year,venue,abstract,externalIds,url"}
    headers = {}
    api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY") or os.environ.get("OMNISCHOLAR_SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
    data = _request_json("https://api.semanticscholar.org/graph/v1/paper/search?" + urllib.parse.urlencode(params), headers=headers)
    records: list[dict[str, Any]] = []
    for item in data.get("data", []):
        ids = item.get("externalIds") or {}
        records.append(_record(provider="semantic_scholar", title=item.get("title"), authors=item.get("authors"), year=item.get("year"), doi=ids.get("DOI"), abstract=item.get("abstract"), url=item.get("url"), venue=item.get("venue"), raw=item))
    return records


def _europe_pmc(query: str, limit: int) -> list[dict[str, Any]]:
    params = {"query": query, "format": "json", "pageSize": str(limit), "resultType": "core"}
    data = _request_json("https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(params))
    records: list[dict[str, Any]] = []
    for item in data.get("resultList", {}).get("result", []):
        records.append(_record(provider="europe_pmc", title=item.get("title"), authors=item.get("authorString", "").split(", ") if item.get("authorString") else [], year=item.get("pubYear"), doi=item.get("doi"), abstract=item.get("abstractText"), url=(f"https://europepmc.org/article/{item.get('source')}/{item.get('id')}" if item.get("source") and item.get("id") else None), venue=item.get("journalTitle"), raw=item))
    return records


def _key(record: dict[str, Any]) -> str:
    if record.get("doi"):
        return "doi:" + str(record["doi"])
    title = re.sub(r"[^a-z0-9]+", " ", str(record.get("title") or "").lower()).strip()
    author = (record.get("authors") or [""])[0].lower()
    return "title:" + title + "|" + author + "|" + str(record.get("year") or "")


def search(query: str, *, providers: list[str] | None = None, limit: int = 10) -> tuple[list[dict[str, Any]], list[str]]:
    query = query.strip()
    if not query:
        raise ValueError("query 不能为空")
    if not isinstance(limit, int) or limit < 1 or limit > 100:
        raise ValueError("limit 必须在 1 到 100 之间")
    selected = providers or list(PROVIDERS)
    unknown = [provider for provider in selected if provider not in PROVIDERS]
    if unknown:
        raise ValueError("未知 provider: " + ", ".join(unknown))
    functions = {"openalex": _openalex, "crossref": _crossref, "semantic_scholar": _semantic_scholar, "europe_pmc": _europe_pmc}
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    for provider in selected:
        try:
            records.extend(functions[provider](query, limit))
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, ValueError, json.JSONDecodeError) as exc:
            warnings.append(f"{provider}: {exc}")
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for record in records:
        key = _key(record)
        if key in seen:
            continue
        seen.add(key)
        record.pop("raw", None)
        deduped.append(record)
    return deduped[:limit], warnings

