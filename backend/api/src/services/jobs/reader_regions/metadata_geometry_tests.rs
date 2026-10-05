use super::{visible_page_size, Dictionary, Document, Object};

fn rect(values: [i64; 4]) -> Object {
    Object::Array(values.into_iter().map(Object::Integer).collect())
}

fn page() -> Dictionary {
    let mut page = Dictionary::new();
    page.set("MediaBox", rect([0, 0, 600, 800]));
    page
}

#[test]
fn crop_box_sets_visible_size_without_reapplying_its_offset() {
    let mut page = page();
    page.set("CropBox", rect([20, 30, 420, 730]));
    assert_eq!(visible_page_size(&Document::new(), &page), (400.0, 700.0));
}

#[test]
fn crop_box_is_intersected_with_media_box() {
    let mut page = page();
    page.set("CropBox", rect([-20, 100, 420, 900]));
    assert_eq!(visible_page_size(&Document::new(), &page), (420.0, 700.0));
}

#[test]
fn reversed_box_corners_and_nonzero_media_origins_are_normalized() {
    let mut page = page();
    page.set("MediaBox", rect([620, 830, 20, 30]));
    page.set("CropBox", rect([420, 730, 40, 50]));
    assert_eq!(visible_page_size(&Document::new(), &page), (380.0, 680.0));
}

#[test]
fn absent_empty_malformed_or_disjoint_crops_fall_back_to_media_box() {
    let document = Document::new();
    let mut page = page();
    assert_eq!(visible_page_size(&document, &page), (600.0, 800.0));
    for crop in [
        rect([20, 30, 20, 730]),
        rect([700, 900, 800, 1000]),
        rect([600, 0, 800, 800]),
        Object::Null,
        Object::Integer(100),
        Object::Array(vec![0.into(), 0.into(), 400.into()]),
        Object::Array(vec![
            0.into(),
            0.into(),
            Object::Null,
            400.into(),
            700.into(),
        ]),
        Object::Array(vec![
            0.into(),
            Object::Real(f32::NAN),
            400.into(),
            700.into(),
        ]),
        Object::Array(vec![
            0.into(),
            0.into(),
            Object::Real(f32::INFINITY),
            700.into(),
        ]),
    ] {
        page.set("CropBox", crop.clone());
        assert_eq!(
            visible_page_size(&document, &page),
            (600.0, 800.0),
            "{crop:?}"
        );
    }
}

#[test]
fn page_tree_attributes_and_indirect_arrays_and_numbers_are_resolved() {
    let mut document = Document::new();
    let width = document.add_object(Object::Integer(600));
    let media = document.add_object(Object::Array(vec![
        0.into(),
        0.into(),
        width.into(),
        800.into(),
    ]));
    let crop = document.add_object(rect([20, 30, 420, 730]));
    let rotation = document.add_object(Object::Integer(90));
    let mut root = Dictionary::new();
    root.set("MediaBox", media);
    root.set("CropBox", crop);
    root.set("Rotate", rotation);
    root.set("UserUnit", 3); // Not inheritable.
    let root = document.add_object(root);
    let mut parent = Dictionary::new();
    parent.set("Parent", root);
    let parent = document.add_object(parent);
    let mut page = Dictionary::new();
    page.set("Parent", parent);
    assert_eq!(visible_page_size(&document, &page), (700.0, 400.0));
    page.set("CropBox", rect([10, 20, 310, 620]));
    page.set("Rotate", 0);
    assert_eq!(visible_page_size(&document, &page), (300.0, 600.0));
    page.set("MediaBox", rect([0, 0, 200, 400]));
    assert_eq!(visible_page_size(&document, &page), (190.0, 380.0));
}

#[test]
fn quarter_turns_swap_dimensions_and_invalid_rotation_is_ignored() {
    let mut page = page();
    page.set("CropBox", rect([20, 30, 420, 730]));
    for rotation in [90, 270, -90, -270, 450] {
        page.set("Rotate", rotation);
        assert_eq!(visible_page_size(&Document::new(), &page), (700.0, 400.0));
    }
    for rotation in [0, 180, -180, 360, 720, 45] {
        page.set("Rotate", rotation);
        assert_eq!(visible_page_size(&Document::new(), &page), (400.0, 700.0));
    }
}

#[test]
fn page_local_user_unit_scales_the_rotated_viewport() {
    let mut document = Document::new();
    let unit = document.add_object(Object::Real(2.5));
    let mut page = page();
    page.set("CropBox", rect([20, 30, 420, 730]));
    page.set("Rotate", 90);
    page.set("UserUnit", unit);
    assert_eq!(visible_page_size(&document, &page), (1750.0, 1000.0));
    for unit in [
        Object::Integer(0),
        Object::Integer(-1),
        Object::Null,
        Object::Real(f32::INFINITY),
    ] {
        page.set("UserUnit", unit);
        assert_eq!(visible_page_size(&document, &page), (700.0, 400.0));
    }
}

#[test]
fn missing_or_invalid_media_box_uses_pdfjs_letter_fallback() {
    let mut page = Dictionary::new();
    assert_eq!(visible_page_size(&Document::new(), &page), (612.0, 792.0));
    page.set("MediaBox", rect([0, 0, 0, 0]));
    assert_eq!(visible_page_size(&Document::new(), &page), (612.0, 792.0));
    page.set("CropBox", rect([20, 30, 420, 730]));
    assert_eq!(visible_page_size(&Document::new(), &page), (400.0, 700.0));
}

#[test]
fn broken_and_cyclic_references_terminate_with_fallback_dimensions() {
    let mut document = Document::new();
    let mut page = page();
    page.set("Parent", (99, 0));
    assert_eq!(visible_page_size(&document, &page), (600.0, 800.0));
    let mut parent = Dictionary::new();
    parent.set("Parent", (1, 0));
    document.objects.insert((1, 0), Object::Dictionary(parent));
    page.set("Parent", (1, 0));
    assert_eq!(visible_page_size(&document, &page), (600.0, 800.0));
    document.objects.insert((2, 0), Object::Reference((2, 0)));
    page.set("CropBox", (2, 0));
    assert_eq!(visible_page_size(&document, &page), (600.0, 800.0));
}
