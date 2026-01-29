import csv
import io
import re
import unicodedata
from typing import Dict, List, Tuple, Optional

def norm_header(s: str) -> str:
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))  # remove accents
    s = re.sub(r"[°\.\-/]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def build_header_map(
    csv_headers: List[str],
    required_internal_fields: List[str],
    aliases_by_internal_field: Dict[str, List[str]],
) -> Tuple[Dict[str, str], List[str]]:
    """
    Returns:
      mapping: internal_field -> csv_column_name
      missing: list of internal_field not found
    """
    # index normalized csv headers
    norm_to_original: Dict[str, str] = {}
    for h in csv_headers:
        nh = norm_header(h)
        if nh and nh not in norm_to_original:
            norm_to_original[nh] = h

    mapping: Dict[str, str] = {}
    missing: List[str] = []

    for field in required_internal_fields:
        candidates = aliases_by_internal_field.get(field, [])
        # allow the field name itself as candidate too
        candidates = [field] + candidates

        found: Optional[str] = None
        for cand in candidates:
            nc = norm_header(cand)
            if nc in norm_to_original:
                found = norm_to_original[nc]
                break

        if not found:
            missing.append(field)
        else:
            mapping[field] = found

    return mapping, missing

def iter_rows_mapped(file_bytes: bytes, delimiter: str = ";"):
    # robust decoding (utf-8-sig handles Excel BOM)
    text = file_bytes.decode("utf-8-sig", errors="replace")
    buf = io.StringIO(text)
    reader = csv.DictReader(buf, delimiter=delimiter)
    return reader
