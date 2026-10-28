import assert from "node:assert/strict";
import test from "node:test";
import { productSuggestions, suggestionTextParts } from "../src/utils/searchSuggestions.js";

test("suggestions retain product IDs, trimmed names, and catalog order", () => {
    assert.deepEqual(productSuggestions([
        { id: 12, name: " Headphones Bluetooth " },
        { id: 14, name: "Headphones Wired" },
        { id: 15, name: " " },
        { id: 16, sku: "UNKNOWN" },
        null,
    ]), [{ id: 12, name: "Headphones Bluetooth" }, { id: 14, name: "Headphones Wired" }]);
});

test("suggestion text preserves internal spacing so it remains a valid catalog query", () => {
    assert.deepEqual(productSuggestions([{ id: 7, name: "  HP  Laptop  " }]), [{ id: 7, name: "HP  Laptop" }]);
});

test("suggestions retain the primary product image for thumbnail display", () => {
    assert.deepEqual(productSuggestions([{
        id: 7,
        name: "Desk lamp",
        images: [
            { image_path: "https://example.test/secondary.jpg", is_primary: false },
            { image_path: "https://example.test/primary.jpg", is_primary: true },
        ],
    }]), [{ id: 7, name: "Desk lamp", imageUrl: "https://example.test/primary.jpg" }]);
});

test("suggestions accept string images and omit unusable image values", () => {
    assert.deepEqual(productSuggestions([
        { id: 1, name: "Mouse", images: [" /storage/mouse.jpg "] },
        { id: 2, name: "Keyboard", images: [{ image_path: null }] },
    ]), [
        { id: 1, name: "Mouse", imageUrl: "/storage/mouse.jpg" },
        { id: 2, name: "Keyboard" },
    ]);
});

test("suggestions ignore invalid responses and stop after ten products", () => {
    assert.deepEqual(productSuggestions(null), []);
    assert.equal(productSuggestions(Array.from({ length: 14 }, (_, i) => ({ id: i + 1, name: `Product ${i}` }))).length, 10);
});

test("products sharing a name retain their individual detail-page IDs", () => {
    assert.deepEqual(productSuggestions([
        { id: 2, name: "Headphones" },
        { id: 3, name: "Headphones" },
        { id: 2, name: "Headphones" },
    ]), [{ id: 2, name: "Headphones" }, { id: 3, name: "Headphones" }]);
});

test("suggestions without a usable product ID cannot be selected", () => {
    assert.deepEqual(productSuggestions([
        { name: "Missing ID" },
        { id: null, name: "Null ID" },
        { id: " ", name: "Blank ID" },
        { id: "42", name: "Valid product" },
    ]), [{ id: "42", name: "Valid product" }]);
});

test("matching text stays regular while the remaining completion is bold", () => {
    assert.deepEqual(suggestionTextParts("Headphones Bluetooth Wireless", "HEADPHONES"), [
        { text: "Headphones", matched: true },
        { text: " Bluetooth Wireless", matched: false },
    ]);
    assert.deepEqual(suggestionTextParts("Wireless Headphones", "headphones"), [
        { text: "Wireless ", matched: false },
        { text: "Headphones", matched: true },
    ]);
});

test("highlighting treats special characters literally and preserves names as text", () => {
    assert.deepEqual(suggestionTextParts("Cable [USB] <Pro>", "[usb]"), [
        { text: "Cable ", matched: false },
        { text: "[USB]", matched: true },
        { text: " <Pro>", matched: false },
    ]);
    assert.deepEqual(suggestionTextParts("Cable [USB]", ".*"), [{ text: "Cable [USB]", matched: false }]);
});

test("all repeated matches preserve the complete name", () => {
    const parts = suggestionTextParts("Audio and AUDIO", " audio ");
    assert.equal(parts.map((part) => part.text).join(""), "Audio and AUDIO");
    assert.equal(parts.filter((part) => part.matched).length, 2);
});
