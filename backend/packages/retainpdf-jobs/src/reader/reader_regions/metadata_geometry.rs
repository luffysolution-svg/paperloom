use lopdf::{Dictionary, Document, Object};

// Match PDF.js's effective view and scale-1 viewport. OCR region coordinates
// already start at the visible page's top-left; do not add CropBox offsets again.
pub(super) fn visible_page_size(document: &Document, page: &Dictionary) -> (f64, f64) {
    let media = inherited_value(document, page, b"MediaBox")
        .and_then(|value| rectangle(document, value))
        .unwrap_or([0.0, 0.0, 612.0, 792.0]);
    let crop = inherited_value(document, page, b"CropBox")
        .and_then(|value| rectangle(document, value))
        .unwrap_or(media);
    let intersection = [
        media[0].max(crop[0]),
        media[1].max(crop[1]),
        media[2].min(crop[2]),
        media[3].min(crop[3]),
    ];
    let view = if intersection[2] > intersection[0] && intersection[3] > intersection[1] {
        intersection
    } else {
        media
    };
    // UserUnit is page-local, unlike the inheritable boxes and rotation.
    let unit = page
        .get(b"UserUnit")
        .ok()
        .and_then(|value| number(document, value))
        .filter(|value| *value > 0.0)
        .unwrap_or(1.0);
    let rotation = inherited_value(document, page, b"Rotate")
        .and_then(|value| number(document, value))
        .filter(|value| value % 90.0 == 0.0)
        .unwrap_or(0.0)
        .rem_euclid(360.0);
    let width = (view[2] - view[0]) * unit;
    let height = (view[3] - view[1]) * unit;
    if rotation == 90.0 || rotation == 270.0 {
        (height, width)
    } else {
        (width, height)
    }
}

fn inherited_value<'a>(
    document: &'a Document,
    mut node: &'a Dictionary,
    key: &[u8],
) -> Option<&'a Object> {
    // Bound traversal of malformed/cyclic page trees, independently of lopdf's
    // own limit on indirect-reference chains.
    for _ in 0..128 {
        if let Ok(value) = node.get(key) {
            return document.dereference(value).ok().map(|(_, value)| value);
        }
        let parent = node.get(b"Parent").ok()?;
        node = document.dereference(parent).ok()?.1.as_dict().ok()?;
    }
    None
}

fn rectangle(document: &Document, value: &Object) -> Option<[f64; 4]> {
    let values = document.dereference(value).ok()?.1.as_array().ok()?;
    let [x0, y0, x1, y1] = values.as_slice() else {
        return None;
    };
    let (x0, y0, x1, y1) = (
        number(document, x0)?,
        number(document, y0)?,
        number(document, x1)?,
        number(document, y1)?,
    );
    let rect = [x0.min(x1), y0.min(y1), x0.max(x1), y0.max(y1)];
    (rect[2] > rect[0] && rect[3] > rect[1]).then_some(rect)
}

fn number(document: &Document, value: &Object) -> Option<f64> {
    let value = match document.dereference(value).ok()?.1 {
        Object::Integer(value) => *value as f64,
        Object::Real(value) => f64::from(*value),
        _ => return None,
    };
    value.is_finite().then_some(value)
}

#[cfg(test)]
#[path = "metadata_geometry_tests.rs"]
mod tests;
