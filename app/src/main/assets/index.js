let baseUri = window.location.host === "127.0.0.1:5500" ? "http://192.168.8.55:8090" : "";
const searchParams = new URL(window.location).searchParams;
async function load() {
    // const path = searchParams.get("path");
    // const res = await fetch(`${baseUri}/svgs`, { cache: "no-store" });
    // return res.json();

    const q = searchParams.get(`q`);
    const t = searchParams.get(`t`);
    const uri = q ? `${baseUri}/search?q=${encodeURIComponent(q)}` : `${baseUri}/svgs?t=${t || ""}`
    const res = await fetch(uri, { cache: "no-store" });
    if (res.status !== 200) {
        throw new Error();
    }
    const objects = await res.json();
    return objects.sort((a, b) => {
        const dif = parseInt(a.update_at) - parseInt(b.update_at);
        if (dif > 0) return -1;
        else if (dif < 0) return 1;
        return 0
    })

}
async function render() {
    const data = await load();
    const container = document.querySelector('.container');
    data.forEach(x => {
        const div = document.createElement('a');
        div.href = "/svg.html?id=" + x.id
        div.textContent = x.title;
        container.appendChild(div);
    });
}
async function initialize() {
    await render();
}
initialize();

const topbarHeader = document.querySelector('.topbar-header');
const searchboxInput = document.querySelector('.searchbox-input');
const topbarBackArrow = document.querySelector('.topbar-back-arrow');
const topbarMenuButton = document.querySelector('.topbar-menu-button');
const iconButton = document.querySelector('.icon-button');
iconButton.addEventListener('click', evt => {
    evt.stopPropagation();
    window.location = `?q=${encodeURIComponent(searchboxInput.value.trim())}`
});
topbarMenuButton.addEventListener('click', evt => {
    topbarHeader.classList.add('search-on');
});
topbarBackArrow.addEventListener('click', evt => {
    topbarHeader.classList.remove('search-on');
});

const barContents = document.querySelector('.bar-contents');


async function loadTags() {
    const res = await fetch(`${baseUri}/svgtags`);
    return res.json();
}
async function renderTags() {
    const data = await loadTags();
    data.push("全部")
    console.log(data);
    data.forEach(x => {
        const div = document.createElement('div');
        div.textContent = x;
        barContents.appendChild(div);

        div.addEventListener('click', evt => {
            if (x === '全部') {
                location.href = `?t=`;
                return
            }
            location.href = `?t=${x}`;
        })
    });
}
renderTags();
