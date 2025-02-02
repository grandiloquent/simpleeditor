items.push([
    103,
    "code",
    "函数",
    () => {
        refactorFunction();
    }
]);

items.push([
    601,
    "code",
    "隔离",
    () => {
        const buf = splitFunc();
        mS1 = buf[0];
        mS2 = buf[2];
        textarea.value = buf[1]
    }
]);
items.push([
    602,
    "content_cut",
    "剪切",
    () => {
        const buf = splitFunc();
        textarea.value = buf[0] + buf[2];
        writeText(buf[1])
    }]);

items.push([
    603,
    "code",
    "变量",
    () => {
        const buf = splitFunc();
        let i = textarea.selectionStart;
        let j = textarea.selectionEnd;
        const s = textarea.value;
        let value;
        if (/[0-9.-]/.test(s[i])) {
            while (i > 0) {
                if (/[0-9.-]/.test(s[i - 1]))
                    i--;
                else
                    break;
            }
            while (j < s.length) {
                j++
                if (!/[0-9.-]/.test(s[j])) {
                    break;
                }
            }
            value = textarea.value.substring(i, j);
        }
        if (!value) return;
        let suffix = 1;
        let name = `n${suffix}`;
        while (new RegExp("\\b" + name + "\\b").test(buf[1])) {
            suffix++;
            name = `n${suffix}`;
        }
      
        let body =value.endsWith(".")? 
        buf[1].replaceAll(new RegExp("\\b" + escapeRegExp(value) + "(?![0-9])",'g'), name)
        : buf[1].replaceAll(new RegExp("\\b" + escapeRegExp(value) + "\\b",'g'), name);

        textarea.value = buf[0] + body.replace('{',`{
float ${name} = ${value};
` ) + buf[2];
        //writeText(buf[1])
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