import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
    ClassicEditor,
    AccessibilityHelp,
    Autoformat,
    Autosave,
    Bold,
    Essentials,
    FontBackgroundColor,
    FontColor,
    FontSize,
    Heading,
    Highlight,
    ImageInline,
    ImageToolbar,
    Italic,
    Link,
    List,
    ListProperties,
    MediaEmbed,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SelectAll,
    SpecialCharacters,
    SpecialCharactersArrows,
    SpecialCharactersCurrency,
    SpecialCharactersEssentials,
    SpecialCharactersLatin,
    SpecialCharactersMathematical,
    SpecialCharactersText,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    Underline,
    Undo,
    Alignment,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

export default function CustomCKEditor({
    editorData,
    onReady,
    onChange,
    onBlur,
}) {
    const fontSizeOptions = [];
    for (let i = 2; i <= 50; i += 2) {
        fontSizeOptions.push({
            title: `${i}px`,
            model: `${i}px`,
            view: {
                name: "span",
            },
        });
    }

    const customStyles = `
    .ck-dropdown__panel .ck-list {
      max-height: 150px; 
      overflow-y: scroll;
    }
  `;

    return (
        <>
            <style>{customStyles}</style>
            <CKEditor
                onReady={onReady || undefined}
                onBlur={onBlur || undefined}
                onChange={onChange || undefined}
                config={{
                    toolbar: {
                        items: [
                            "undo",
                            "redo",
                            "|",
                            "heading",
                            "|",
                            "fontSize",
                            "fontColor",
                            "fontBackgroundColor",
                            "|",
                            "bold",
                            "italic",
                            "underline",
                            "removeFormat",
                            "|",
                            "specialCharacters",
                            "link",
                            "mediaEmbed",
                            "insertTable",
                            "highlight",
                            "|",
                            "bulletedList",
                            "numberedList",
                            "outdent",
                            "alignment",
                        ],
                        shouldNotGroupWhenFull: true,
                    },
                    plugins: [
                        Alignment,
                        AccessibilityHelp,
                        Autoformat,
                        Autosave,
                        Bold,
                        Essentials,
                        FontBackgroundColor,
                        FontColor,
                        FontSize,
                        Heading,
                        Highlight,
                        ImageInline,
                        ImageToolbar,
                        Italic,
                        Link,
                        List,
                        ListProperties,
                        MediaEmbed,
                        Paragraph,
                        PasteFromOffice,
                        RemoveFormat,
                        SelectAll,
                        SpecialCharacters,
                        SpecialCharactersArrows,
                        SpecialCharactersCurrency,
                        SpecialCharactersEssentials,
                        SpecialCharactersLatin,
                        SpecialCharactersMathematical,
                        SpecialCharactersText,
                        Table,
                        TableCaption,
                        TableCellProperties,
                        TableColumnResize,
                        TableProperties,
                        TableToolbar,
                        TextTransformation,
                        Underline,
                        Undo,
                    ],
                    list: {
                        properties: {
                            styles: true,
                            startIndex: true,
                            reversed: true,
                        },
                    },
                    image: {
                        toolbar: ["imageTextAlternative"],
                    },
                    fontSize: {
                        options: fontSizeOptions,
                        supportAllValues: true,
                    },
                    table: {
                        contentToolbar: [
                            "tableColumn",
                            "tableRow",
                            "mergeTableCells",
                            "tableProperties",
                            "tableCellProperties",
                        ],
                    },
                }}
                editor={ClassicEditor}
                data={editorData}
                className="custom-quill"
                style={{ width: "100%", height: "100%" }}
            />
        </>
    );
}
