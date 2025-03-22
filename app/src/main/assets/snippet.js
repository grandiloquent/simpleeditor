async function showSnipptDialog(t) {
    async function load() {
        const res = await fetch(`${baseUri}/snippets?t=${t || '0'}`, { cache: "no-store" });
        return res.json();
    }
    const dialog = document.createElement('custom-dialog');
    const container = document.createElement('div');
    container.style = `
    display: flex;
    flex-direction: column;
    row-gap: 4px;
    font-size: 18px;
    line-height: 24px;
    align-items: stretch;
    justify-content: center;
`
    try {
        const data = await load();
        data.forEach(x => {
            const item = document.createElement("div");
            item.style = `
            display: flex;    
            border-bottom:1px solid #dadce0;`;
            const keyword = document.createElement("div");

            keyword.textContent = x.keyword;
            keyword.style.flexGrow = "1"
            item.appendChild(keyword);
            const edit = document.createElement('div');
            edit.dataset.id = x.id;
            edit.dataset.src = x.keyword;
            edit.textContent = "编辑"
            edit.style = `flex-shrink:0;
font-size:16px;
color:#999`

            item.appendChild(edit)
            container.appendChild(item);
            // const content = document.createElement("div");
            // content.style = `-webkit-line-clamp:2;display:-webkit-box;text-overflow:ellipsis;font-size:16px;max-height:4.4em;line-height:24px;overflow:hidden;max-width:100%`
            // content.textContent = x.content;
            // container.appendChild(content);


            item.addEventListener("click", async () => {

                const res = await fetch(`${baseUri}/snippet?k=${x.keyword}&t=${t || '0'}`, { cache: "no-store" })
                if (res.status === 200) {
                    textarea.setRangeText(await res.text(), textarea.selectionStart, textarea.selectionEnd);
                }

                dialog.remove();
            });
            edit.addEventListener("click", async () => {
                dialog.remove();
                editSnipptDialog(parseInt(edit.dataset.id), edit.dataset.src,t);
            });
            // content.addEventListener("click", () => {
            //     textarea.value = x.id;
            // });

        });
    } catch (error) {

    }

    dialog.appendChild(container);

    dialog.addEventListener('close', async () => {
        editSnipptDialog(null, null, t);
    });
    document.body.appendChild(dialog);
}

async function editSnipptDialog(id, keyword, t) {
    async function load(keyword,t) {
        const res = await fetch(`${baseUri}/snippet?k=${keyword}&t=${t || '0'}`, { cache: "no-store" })
        return res.text();
    }
    const dialog = document.createElement('custom-dialog');
    const div = document.createElement('div');
    div.style = `
    display: flex;
    flex-direction: column;
    row-gap: 4px;
    font-size: 18px;
    line-height: 24px;
    align-items: stretch;
    justify-content: center;
`
    const idInput = document.createElement('input');
    const keywordInput = document.createElement('input');
    const contentInput = document.createElement('textarea');
    div.appendChild(idInput);
    div.appendChild(keywordInput);
    div.appendChild(contentInput);
    try {
        if (keyword) {
            const data = await load(keyword,t);
            idInput.value = id;
            keywordInput.value = keyword;
            contentInput.value = data;
        }

    } catch (error) {

    }

    dialog.appendChild(div);

    dialog.addEventListener('submit', async () => {

        const obj = {
            keyword: keywordInput.value.trim(),
            content: contentInput.value.trim(),
            type: t
        };
        if (id) {
            obj.id = id;
        }
        const res = await fetch(`${baseUri}/snippet`, {
            method: "POST",
            body: JSON.stringify(obj)
        });
        try {

            toast.setAttribute('message', '成功');
        } catch (error) {
            toast.setAttribute('message', '错误');
        }
    });
    document.body.appendChild(dialog);
}

