items.push([
    304,
    "code",
    "退转",
    () => {
        const points = getLine(textarea);
        const value = parseInt(textarea.value.substring(points[0], points[1])) + 2;
        const lines = textarea.value.split('\n');
        let index = 0;
        for (let i = 0; i < lines.length; i++) {
            if (value != i) {
                index += lines[i].length + 1;
            } else {
                break;
            }

        }
        textarea.focus();
        textarea.scrollTop = 0;
        const fullText = textarea.value;
        textarea.value = fullText.substring(0, index);
        textarea.scrollTop = textarea.scrollHeight;
        textarea.value = fullText;

        textarea.selectionStart = index;

    }
]);

function refactorFunction() {

    const points = findExtendPosition(textarea);
    let i = points[0];
    let j = points[1];
    const s = textarea.value.substring(i, j).trim();

    textarea.setRangeText(`${substringBefore(s, '\n')}();`, points[0], points[1]);

    textarea.value = textarea.value + `
function ${substringBefore(s, '\n')}(){
    ${substringAfter(s, '\n')}

    return false;
    }`;
    // textarea.setRangeText("", points[1], points[1]);
}
items.push([
    303,
    "code",
    "函数",
    () => {
        refactorJavaScriptFunction();
    }
]);
items.push([
    302,
    "content_cut",
    "剪切",
    () => {
        const buf = splitFunc();
        textarea.value = buf[0] + buf[2];
        writeText(buf[1])
    }]);
document.addEventListener('keydown', async evt => {
    if (evt.ctrlKey) {
        if (evt.key === 's') {
            evt.preventDefault();
            await saveData();
        }
    } else {
        if (evt.key === 'F1') {
            evt.preventDefault();
            formatCode()

        } else if (evt.key === 'F2') {
            evt.preventDefault();

        } else if (evt.key === 'F3') {
            evt.preventDefault();
            deleteBlock()
            //textarea.value = "其他\n" + (await readText()).replace(`var createScene = `, `const createScene = async `)
        } else if (evt.key === 'F4') {
            evt.preventDefault();
            // await saveData();
            // if (typeof NativeAndroid !== 'undefined') {
            //     NativeAndroid.launchApp("psycho.euphoria.l", `/svgviewer?id=${id}`);
            // } else {
            //     window.open(`${baseUri}/svgviewer?id=${id}`, '_blank');
            // }
            formatHead(textarea)

        } else if (evt.key === 'F5') {
            evt.preventDefault();
            window.open(`${baseUri}/viewer?id=${(await insertData())}`, '_blank')
        } else if (evt.key === 'F6') {
            evt.preventDefault();
            insertSnippets()
        } else if (evt.key === 'F7') {
            evt.preventDefault();
            updateTags();
        }
    }

})


async function init() {
    try {
        await loadData();
    } catch (error) {
    }
    initializeToolbars()
}
init();