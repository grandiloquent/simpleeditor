items.push([
    103,
    "code",
    "重构",
    () => {
        refactorFunction();
    }
]);

items.push([
    601,
    "code",
    "隔离",
    () => {
        findFunc();
    }
]);
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