import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function RichTextEditor({ value, onChange, placeholder }) {
    const modules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }], // Headings
            ["bold", "italic", "underline", "strike"], // Text styles
            [{ list: "ordered" }, { list: "bullet" }], // Lists
            ["link"], // Link only
            ["clean"], // Clear formatting
        ],
        // ✅ IMPORTANT: This ensures the toolbar doesn't keep "Heading 1" selected by default
        clipboard: {
            matchVisual: false,
        },
    };

    const formats = [
        "header",
        "bold",
        "italic",
        "underline",
        "strike",
        "list",
        "bullet",
        "link",
    ];

    return (
        <div className="rich-text-editor" style={{ marginBottom: 10 }}>
            <ReactQuill
                theme="snow"
                value={value || ""}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder || "Write product description…"}
                style={{ height: "200px", marginBottom: "40px" }}
            />
        </div>
    );
}
