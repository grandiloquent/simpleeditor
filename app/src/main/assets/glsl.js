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

        let i = textarea.selectionStart;
        let j = textarea.selectionEnd;
        const s = textarea.value;
        let value;
        let founed = true;
        if (s[i] === '(') {
            let count = 0;
            while (i > 0) {
                if (s[i] === '(') {
                    count++;
                } else if (!/[a-zA-Z0-9.]/.test(s[i])) {
                    i++;
                    break;
                }
                i--;
            }

            while (j < s.length) {
                j++
                if (s[j] === '(') {
                    count++;
                } else if (s[j] === ')') {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
            }
        }

        if (founed) {

            value = textarea.value.substring(i, j);
        }
        if (!value) return;
        const buf = splitFunc();
        let suffix = 1;
        let name = `n${suffix}`;
        while (new RegExp("\\b" + name + "\\b").test(buf[1])) {
            suffix++;
            name = `n${suffix}`;
        }

        let body = buf[1].replaceAll(new RegExp("\\b" + escapeRegExp(value), 'g'), name);
        let index = buf[1].indexOf(value);
        while (index > 0 && (body[index - 1] !== ';' && body[index - 1] !== '{')) {
            index--;
        }

        textarea.value = `${buf[0]}
${body.substring(0, index)}
float ${name} = ${value};    
${body.substring(index).replace('`', '')}
${buf[2]}`;


        //writeText(buf[1])
    }]);

items.push([
    604,
    "code",
    "标记",
    () => {
        let i = textarea.selectionStart;
        let j = textarea.selectionEnd;

        textarea.setRangeText("`", i, j);

    }]);
items.push([
    605,
    "code",
    "评注",
    () => {

        let i = textarea.selectionStart;
        let j = textarea.selectionEnd;
        const s = textarea.value;

        if (s[i] === '{') {

            i++;
            let count = 0;
            while (j < s.length) {
                if (s[j] == '{') {
                    count++;
                } else if (s[j] == '}') {
                    console.log(count,"------------")
                    count--;
                    if (count === 0)
                        break;
                }
                j++;
            }
            const array = textarea.value.substring(i, j).trim().split('\n');
            
            let f = array[0].startsWith("//");
            textarea.setRangeText(`
${array.map(x => {
                if (f && x.trim().startsWith("//"))
                    return x.trim().substring(2)
                else if (!f)
                    return "//" + x;
                else return x;
            }).join('\n')}`, i, j);
        } else if (s[i] === ';') {

            while (i > 0 && s[i - 1] != ';' && s[i - 1] != '{' && s[i - 1] != '}') {
                i--;
            }
            while (j < s.length && s[j] != '\n') {
                j++;
            }
            const array = textarea.value.substring(i, j).trim().split('\n');
            console.log(array)
            let f = array[0].startsWith("//");
            textarea.setRangeText(`
${array.map(x => {
                if (f && x.trim().startsWith("//"))
                    return x.trim().substring(2)
                else if (!f)
                    return "//" + x;
                else return x;
            }).join('\n')}`, i, j);
        }


        // if (founed) {
        //     let sss = s.substring(i + 1, j);
        //     let array = sss.split('\n');
        //     textarea.setRangeText(array.map(x => {
        //         if (array[0].startsWith("//"))
        //             return x.trim().substring(2)
        //         else
        //             return "//" + x;
        //     }).join('\n'), i, j);

        // }

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