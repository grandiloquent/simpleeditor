async function initializeToolbars() {
    let topIndexs;
    let bottomIndexs;

    // try {
    //     const response = await fetch(`${baseUri}/ts`);
    //     if (response.status > 399 || response.status < 200) {
    //         throw new Error(`${response.status}: ${response.statusText}`)
    //     }
    //     const results = JSON.parse(await response.text());
    //     if (results) {
    //         topIndexs = results[0];
    //         bottomIndexs = results[1];
    //     }
    // } catch (error) {
    //topIndexs = [1, 36, 14, 30, 103, 20, 32, 16, 2]

    if (document.title.endsWith(".glsl")) {
        topIndexs = [1, 603, 602, 30, 103, 14, 601, 2]

    } else {
       // topIndexs = [1, 15, 16, 18, 22, 20, 21, 2]
       topIndexs = [1, 603, 302, 30, 303, 14, 304, 2]
    }
    if (document.title.endsWith(".glsl")) {
        bottomIndexs = [3, 28, 604, 605, 22, 35, 25, 34]
    } else if (document.title.startsWith("ShaderToy")) {
        bottomIndexs = [3, 28, 31, 33, 22, 35, 24, 34]
    } else {
        //bottomIndexs = [3, 28, 31, 33, 22, 35, 24, 34]
        bottomIndexs = [3, 28, 604, 605, 22, 35, 25, 34]
    }

    //}
    insertItem(topIndexs, '.bar-renderer.top', 'bar-item-tab');
    insertItem(bottomIndexs, '.bar-renderer.bottom', 'bar-item-tab');
}
///////////////////////////////////////////////////
const items = [
    [
        1,
        "preview",
        "预览",
        async () => {
            await saveData();
            if ((!/\.[a-z0-9]+$/.test(document.title))) {
                if (typeof NativeAndroid !== 'undefined') {
                    NativeAndroid.launchApp(id);
                } else {
                    window.open(`${baseUri}/viewer?id=${id}`, '_blank');
                }
            }

        }
    ], [
        2,
        "save",
        "保存",
        async () => {
            updateTags()
        }
    ], [
        3,
        "code",
        "格式",
        () => {
            formatCode();
        }
    ], [
        4,
        "help",
        "帮助",
        () => {
            window.open(`${baseUri}/snippet.html`, '_blank');
        }
    ],
    [
        5,
        "text_snippet",
        "代码",
        () => {
            snippet(textarea);
        }
    ], [
        6,
        "text_snippet",
        "计算",
        () => {
            let points = getLine(textarea);
            let line = textarea.value.substring(points[0], points[1]);
            let results = eval(line);
            writeText(results);
            textarea.setRangeText(`${line}
            ${results}
            `, points[0], points[1])
        }
    ], [
        7,
        "comment",
        "注释",
        () => {
            commentLine(textarea)
        }
    ], [
        8,
        "animation",
        "动画",
        () => {
            calculate()
        }
    ], [
        9,
        "find_replace",
        "搜索",
        () => {
            searchWord(textarea);
        }
    ], [
        10,
        "text_snippet",
        "函数",
        () => {
            functions(textarea);
        }
    ], [
        11,
        "find_replace",
        "替换",
        () => {
            findReplace(textarea);
        }
    ], [
        12,
        "text_snippet",
        "翻译",
        () => {
            translate(textarea);
        }
    ], [
        13,
        "close",
        "剪行",
        () => {

            deleteLine(textarea)
        }
    ], [
        14,
        "content_copy",
        "复行",
        () => {
            copyLine(textarea)
        }
    ], [
        15,
        "content_copy",
        "复制",
        async () => {
            copyCode();
        }
    ], [
        16,
        "link",
        "打开",
        () => {
            openFile();
        }
    ],
];
items.push([
    37,
    "close",
    "删除",
    () => {
        deleteBlock(textarea);
    }
]);
items.push([
    36,
    "edit_off",
    "评注",
    () => {
        commentBlock();
    }
]);
items.push([
    35,
    "search",
    "搜索",
    () => {
        search();
    }
]);
items.push([
    34,
    "add",
    "新建",
    () => {
        newScript();
    }
]);
items.push([
    33,
    "content_copy",
    "复字",
    () => {
        copyName()
    }
]);
items.push([
    32,
    "sort_by_alpha",
    "排序",
    () => {
        sortJavaScriptFunctions()
    }
]);
items.push([
    31,
    "variable_add",
    "变量",
    () => {
        addVariable();
    }
]);
items.push([
    17,
    "download",
    "下载",
    async () => {
        await download(baseUri);
    }
]);
items.push([
    18,
    "g_translate",
    "翻译",
    async () => {
        await translateEnglish(textarea);
    }
]);
items.push([
    19,
    "translate",
    "翻译",
    async () => {
        await translateEnglish(textarea, 'en');
    }
]);
items.push([
    20,
    "code",
    "函数",
    async () => {
        fun(textarea)
    }
]);
items.push([
    21,
    "clear",
    "删除",
    () => {
        cutLine(textarea);
    }
]);
items.push([
    22,
    "translate",
    "函数",
    () => {
        translateCode(textarea)
    }
]);
items.push([
    23,
    "format_bold",
    "粗体",
    () => {
        formatBold(textarea)
    }
]);
items.push([
    24,
    "add",
    "新建",
    () => {
        newFile();
    }
]);
items.push([
    25,
    "find_replace",
    "搜索",
    () => {
        replaceString()
    }
]);
items.push([
    26,
    "code",
    "代码",
    () => {
        formatCode(textarea)
    }
]);
items.push([
    27,
    "save",
    "保存",
    () => {
        saveFile();
    }
]);
items.push([
    28,
    "code",
    "代码段",
    () => {
        insertSnippets();
    }
]);
items.push([
    29,
    "edit_off",
    "注释",
    () => {
        commentOut();
    }
]);
items.push([
    30,
    "content_cut",
    "剪行",
    () => {
        deleteLine();
    }
]);
items.push([
    102,
    "edit_off",
    "注释",
    () => {
        commentLines();
    }
]);
items.push([
    101,
    "code",
    "定义",
    () => {
        defineFunction();
    }
]);
