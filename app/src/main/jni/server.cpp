#include "server.h"
#include "format.h"
#include "fmt/include/fmt/format.h"

namespace std {

    template<class BidirIt, class Traits, class CharT, class UnaryFunction>
    std::basic_string<CharT> regex_replace(BidirIt first, BidirIt last,
                                           const std::basic_regex<CharT, Traits> &re,
                                           UnaryFunction f) {
        std::basic_string<CharT> s;

        typename std::match_results<BidirIt>::difference_type
                positionOfLastMatch = 0;
        auto endOfLastMatch = first;

        auto callback = [&](const std::match_results<BidirIt> &match) {
            auto positionOfThisMatch = match.position(0);
            auto diff = positionOfThisMatch - positionOfLastMatch;

            auto startOfThisMatch = endOfLastMatch;
            std::advance(startOfThisMatch, diff);

            s.append(endOfLastMatch, startOfThisMatch);
            s.append(f(match));

            auto lengthOfMatch = match.length(0);

            positionOfLastMatch = positionOfThisMatch + lengthOfMatch;

            endOfLastMatch = startOfThisMatch;
            std::advance(endOfLastMatch, lengthOfMatch);
        };

        std::regex_iterator<BidirIt> begin(first, last, re), end;
        std::for_each(begin, end, callback);

        s.append(endOfLastMatch, last);

        return s;
    }

    template<class Traits, class CharT, class UnaryFunction>
    std::string regex_replace(const std::string &s,
                              const std::basic_regex<CharT, Traits> &re, UnaryFunction f) {
        return regex_replace(s.cbegin(), s.cend(), re, f);
    }

} // namespace std


#define CPPHTTPLIB_OPENSSL_SUPPORT

static const char db_name[] = "/storage/emulated/0/.editor/editor.db";
using db = sqlite::Database<db_name>;

void serveFile(const std::filesystem::path &p, httplib::Response &res,
               const std::map<std::string, std::string> t, std::string &d) {

    if (p.extension().string() == ".html" || p.extension().string() == ".xhtml") {
        auto s = ReadAllText(p);
        s = ReplaceFirst(s, "</head>",
                         R"(<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>)");
        res.set_content(s, "text/html");
        return;
    }

    std::shared_ptr<std::ifstream> fs = std::make_shared<std::ifstream>();
    fs->exceptions(std::ifstream::failbit | std::ifstream::badbit);
    try {
        fs->open(p, std::ios_base::binary);
    } catch (std::system_error &e) {
        res.status = 404;
        return;
    }
    fs->seekg(0, std::ios_base::end);
    auto end = fs->tellg();

    if (end == 0)return;
    fs->seekg(0);
    std::map<std::string, std::string> file_extension_and_mimetype_map;
    auto contentType = httplib::detail::find_content_type(p, t, d);
    if (contentType.empty()) {
        contentType = "application/octet-stream";
    }
    res.set_content_provider(static_cast<size_t>(end),
                             contentType,
                             [fs](uint64_t offset,
                                  uint64_t length,
                                  httplib::DataSink &sink) {
                                 if (fs->fail()) {
                                     return false;
                                 }
                                 fs->seekg(offset, std::ios_base::beg);
                                 size_t bufSize = 81920;
                                 char buffer[bufSize];

                                 try {
                                     fs->read(buffer, bufSize);
                                 } catch (std::system_error &e) {
                                 }
                                 sink.write(buffer,
                                            static_cast<size_t>(fs->gcount()));
                                 return true;
                             });
}


std::filesystem::path FindFile(const httplib::Request &req) {

    auto dir = std::filesystem::path{"/storage/emulated/0/.editor"};
    auto p = dir.append(req.path.substr(1));
    if (exists(p)) {
        return p;
    }
    return std::filesystem::path{
    };
}

bool render_markdown(const char *raw, size_t raw_size, std::string &html) {
    auto process_out = +[](const MD_CHAR *text, MD_SIZE size, void *user) {
        std::string *out = (std::string *) user;
        out->append(text, size);
    };

    int ret = md_html(raw, raw_size, process_out, (void *) (&html),
                      MD_FLAG_TABLES | MD_FLAG_PERMISSIVEAUTOLINKS, MD_HTML_FLAG_SKIP_UTF8_BOM);
    if (ret != 0)
        return false;

    return true;
}

void StartServer(JNIEnv *env, jobject assetManager, const std::string &host, int port) {
    static const char table[]
            = R"(CREATE TABLE IF NOT EXISTS "svg" (
	"id"	INTEGER NOT NULL UNIQUE,
	"title"	TEXT NOT NULL,
	"content"	TEXT NOT NULL,

	"create_at"	INTEGER,
	"update_at"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
))";
    db::query<table>();
    static const char table1[]
            = R"(CREATE TABLE IF NOT EXISTS "snippet" (
	"id"	INTEGER,
	"keyword" TEXT,
	"content"	TEXT,
	"views" INTEGER,
	"type" TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
))";
    db::query<table1>();

    static const char table2[]
            = R"(CREATE TABLE IF NOT EXISTS "tag" (
	"id"	INTEGER,
	"name" TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
))";
    db::query<table2>();
    static const char table3[]
            = R"(CREATE TABLE IF NOT EXISTS "svg_tag" (
	"id"	INTEGER,
	"svg_id"	INTEGER,
	"tag_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT)
))";
    db::query<table3>();

    AAssetManager *mgr = AAssetManager_fromJava(env, assetManager);
    std::map<std::string, std::string> t{};
    std::string d{"application/octet-stream"};
    httplib::Server server;
    server.Get(
            R"(/(.+\.(?:js|css|html|xhtml|ttf|png|jpg|jpeg|gif|json|svg|wasm|babylon|blend|glb|ogg|txt|hdr|pdb|obj))?)",
            [&t, mgr, &d](const httplib::Request &req,
                          httplib::Response &res) {
                res.set_header("Access-Control-Allow-Origin", "*");
                auto p = req.path == "/" ? "index.html" : req.path.substr(1);
                unsigned char *data;
                unsigned int len = 0;
                ReadBytesAsset(mgr, p,
                               &data, &len);
                auto str = std::string(reinterpret_cast<const char *>(data), len);
                if (str.length() == 0) {
                    auto file = FindFile(req);
                    if (is_regular_file(file)) {
                        serveFile(file, res, t, d);
                        return;
                    }
                }
                if (str.empty()) {
                    res.status = 404;
                    return;
                }
                auto content_type = httplib::detail::find_content_type(p, t, d);
                res.set_content(str, content_type);
            });
    server.Post("/svg", [](const httplib::Request &req, httplib::Response &res,
                           const httplib::ContentReader &content_reader) {
        res.set_header("Access-Control-Allow-Origin", "*");

        std::string body;
        content_reader([&](const char *data, size_t data_length) {
            body.append(data, data_length);
            return true;
        });
        nlohmann::json doc = nlohmann::json::parse(body);
        std::string title = doc["title"];
        std::string content;
        if (doc.contains("content")) {
            content = doc["content"];
        }
        if (doc.contains("id") && doc["id"] > 0) {
            int id = doc["id"];
            static const char query[]
                    = R"(UPDATE svg SET title=coalesce(?1,title),content=coalesce(?2,content),update_at=?3 where id =?4)";
            db::QueryResult fetch_row = db::query<query>(title,
                                                         content,
                                                         GetTimeStamp(),
                                                         id
            );
            res.set_content(std::to_string(fetch_row.resultCode()),
                            "text/plain; charset=UTF-8");
        } else {
            static const char query[]
                    = R"(INSERT INTO svg (title,content,create_at,update_at) VALUES(?1,?2,?3,?4))";
            db::QueryResult fetch_row = db::query<query>(title,
                                                         content,
                                                         GetTimeStamp(),
                                                         GetTimeStamp()
            );
            static const char query1[]
                    = R"(SELECT last_insert_rowid())";
            std::string_view rowid;
            auto fr = db::query<query1>();
            if (fr(rowid)) {
                res.set_content(std::string{rowid.begin(), rowid.end()},
                                "text/plain; charset=UTF-8");
            } else {
                res.set_content(std::to_string(fetch_row.resultCode()),
                                "text/plain; charset=UTF-8");
            }

        }
    });
    server.Get("/svg", [](const httplib::Request &req, httplib::Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto id = req.get_param_value("id");
        static const char query[]
                = R"(select title, content, create_at, update_at from svg WHERE id = ?1)";
        db::QueryResult fetch_row = db::query<query>(id);
        std::string_view title, content, create_at, update_at;

        if (fetch_row(title, content, create_at, update_at)) {
            nlohmann::json j = {
                    {"title",     title},
                    {"content",   content},
                    {"create_at", create_at},
                    {"update_at", update_at},
            };
            res.set_content(j.dump(), "application/json");
        }
    });
    server.Get("/search", [](const httplib::Request &req, httplib::Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");

        auto q = req.get_param_value("q");
        static const char query[]
                = R"(SELECT id,title,content,update_at FROM svg)";
        db::QueryResult fetch_row = db::query<query>();
        std::string id, title, content, update_at;

        nlohmann::json doc = nlohmann::json::array();
        std::regex q_regex(q);
        while (fetch_row(id, title, content, update_at)) {
            if (std::regex_search(title, q_regex) || std::regex_search(content, q_regex)) {
                nlohmann::json j = {

                        {"id",        id},
                        {"title",     title},
                        {"update_at", update_at},

                };
                doc.push_back(j);
            }

        }
        res.set_content(doc.dump(), "application/json");
    });

    server.Get("/svgs", [](const httplib::Request &req, httplib::Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto t = req.get_param_value("t");
        if (t.empty()) {
            static const char query[]
                    // SELECT id,title,update_at FROM svg ORDER BY update_at DESC limit 500
                    = R"(select id,title,update_at from svg where id not in (select svg_id from svg_tag))";
            db::QueryResult fetch_row = db::query<query>();
            std::string_view id, title, update_at;

            nlohmann::json doc = nlohmann::json::array();
            while (fetch_row(id, title, update_at)) {
                nlohmann::json j = {

                        {"id",        id},
                        {"title",     title},
                        {"update_at", update_at},

                };
                doc.push_back(j);
            }
            res.set_content(doc.dump(), "application/json");
        } else {
            static const char query[]
                    = R"(SELECT svg.id,title,update_at FROM svg join svg_tag on svg.id = svg_tag.svg_id join tag on tag.id = svg_tag.tag_id where tag.name = ?1 ORDER BY update_at DESC)";
            db::QueryResult fetch_row = db::query<query>(t);
            std::string_view id, title, update_at;

            nlohmann::json doc = nlohmann::json::array();
            while (fetch_row(id, title, update_at)) {
                nlohmann::json j = {

                        {"id",        id},
                        {"title",     title},
                        {"update_at", update_at},

                };
                doc.push_back(j);
            }
            res.set_content(doc.dump(), "application/json");
        }

    });

    server.Get("/snippets", [](const httplib::Request &req, httplib::Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto t = req.get_param_value("t");
        static const char query[]
                = R"(SELECT keyword,id FROM snippet where type = ?1 ORDER BY views)";
        db::QueryResult fetch_row = db::query<query>(t);
        std::string_view keyword, id;
        nlohmann::json doc = nlohmann::json::array();
        while (fetch_row(keyword, id)) {
            nlohmann::json j = {
                    {"keyword", keyword},
                    {"id",      id}
            };
            doc.push_back(j);
        }
        res.set_content(doc.dump(), "application/json");
    });
    server.Get("/snippet", [](const httplib::Request &req, httplib::Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto k = req.get_param_value("k");
        auto t = req.get_param_value("t");

        static const char query[]
                = R"(SELECT content FROM snippet where keyword = ?1 and type = ?2)";
        db::QueryResult fetch_row = db::query<query>(k, t);
        std::string_view content;
        if (fetch_row(content)) {
            res.set_content(content.data(), content.size(), "application/json");
        }

    });

    server.Post("/snippet", [](const httplib::Request &req, httplib::Response &res,
                               const httplib::ContentReader &content_reader) {
        res.set_header("Access-Control-Allow-Origin", "*");

        std::string body;
        content_reader([&](const char *data, size_t data_length) {
            body.append(data, data_length);
            return true;
        });
        nlohmann::json doc = nlohmann::json::parse(body);
        std::string keyword;
        if (doc.contains("keyword")) {
            keyword = doc["keyword"];
        }
        std::string content;
        if (doc.contains("content")) {
            content = doc["content"];
        }
        std::string type;
        if (doc.contains("type")) {
            type = doc["type"];
        }
        int id = 0;
        if (doc.contains("id")) {
            id = doc["id"];
        }
        if (id == 0) {
            static const char query[]
                    = R"(INSERT INTO snippet (content,keyword,type) VALUES(?1,?2,?3))";
            db::QueryResult fetch_row = db::query<query>(content, keyword, type);

            res.set_content(std::to_string(fetch_row.resultCode()),
                            "text/plain; charset=UTF-8");
        } else {
            static const char query[]
                    = R"(UPDATE snippet SET content=coalesce(NULLIF(?1,''),content),keyword=coalesce(NULLIF(?2,''),keyword),type=coalesce(NULLIF(?3,''),type) where id =?4)";
            db::QueryResult fetch_row = db::query<query>(content, keyword, type, id);

            res.set_content(std::to_string(fetch_row.resultCode()),
                            "text/plain; charset=UTF-8");
        }

    });

    server.Post("/snippet/hit", [](const httplib::Request &req, httplib::Response &res,
                                   const httplib::ContentReader &content_reader) {
        res.set_header("Access-Control-Allow-Origin", "*");

        std::string body;
        content_reader([&](const char *data, size_t data_length) {
            body.append(data, data_length);
            return true;
        });
        static const char query[]
                = R"(UPDATE snippet SET views = COALESCE(views,0) + 1 WHERE content = ?1)";
        db::QueryResult fetch_row = db::query<query>(body);

        res.set_content(std::to_string(fetch_row.resultCode()),
                        "text/plain; charset=UTF-8");
    });
    server.Get("/viewer", [](const httplib::Request &req, httplib::Response &res) {
                   res.set_header("Access-Control-Allow-Origin", "*");
                   auto id = req.get_param_value("id");
                   static const char query[]
                           = R"(select title, content, create_at, update_at from svg WHERE id = ?1)";
                   db::QueryResult fetch_row = db::query<query>(id);
                   std::string_view title, content, create_at, update_at;
                   if (fetch_row(title, content, create_at, update_at)) {
                       std::stringstream ss;
                       if (title.starts_with("Three")) {

                           auto script = std::string{};
                           auto str = std::string{content.data(), content.size()};
                           if (content.find("</script>") != std::string::npos) {
                               script = SubstringBeforeLast(str, "</script>") + "</script>";
                               str = SubstringAfterLast(str, "</script>");
                           }

                           ss << R"(<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>)" <<
                              title <<
                              R"(</title>
    <link rel="stylesheet" href="/file?id=25">
    <script type="importmap">
        {
            "imports": {
                "three": "https://fastly.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js",
                "three/addons/": "https://fastly.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
            }
        }
    </script>
    )" <<
                              script <<
                              R"(
</head>

<body>
    <div id="container"></div>
    <script type="module">

        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        )" <<
                              str <<
                              R"(

    </script>
</body>

</html>)";


                       } else if (title.starts_with("JavaScript")) {
                           ss << R"(<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>)" << title << R"(</title>
</head>

<body>)" << content << R"(</body>

</html>)";

                       } else if (title.starts_with("ShaderToy")) {

                           auto str = std::string{content.data(), content.size()};
                           std::string output_text = std::regex_replace(str, std::regex(R"(/file\?id\=(\d+))"),
                                                                        [](const std::smatch &m) {
                                                                            static const char query[]
                                                                                    = R"(SELECT content FROM svg where id = ?1)";
                                                                            db::QueryResult fetch_row = db::query<query>(m.str(1));
                                                                            std::string content;
                                                                            if (fetch_row(content)) {

                                                                                return escapeJSON(content);
                                                                            }
                                                                            return std::string{};
                                                                        });
                           ss << R"(<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>)" << title << R"(</title>
    <script>
        function substringAfterLast(str, needle) {
            const index = str.lastIndexOf(needle);

            if (index === -1) return str
            return str.substring(index + 1);
        }
    </script>
</head>

<body>
    <div id="player">
        <canvas id="demogl" class="playerCanvas" tabindex="0" width="256" height="144"></canvas>
    </div>
    <script src="2.js"></script>
    <script src="3.js"></script>
    <script src="15.js"></script>
    <script src="16.js"></script>
    <script>
        const obj =)" << output_text << R"(
        watchInit(obj)
    </script>
</body>

</html>)";
                       } else if (title.starts_with("GLSL")) {
                           ss << R"(<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>)" <<
                              title <<
                              R"(</title>
    <style>
        body {
            height: 100%;
            margin: 0;
        }

        canvas {
            width: 512px;
            height: 288px;
        }
    </style>
    <script type="x-shader/x-vertex" id="vs">#version 300 es
        #ifdef GL_ES
        precision highp float;
        precision highp int;
        precision mediump sampler3D;
        #endif
        layout(location = 0) in vec2 pos;
        void main() {
            gl_Position = vec4(pos.xy, 0.0f, 1.0f);
        }</script>
    <script type="x-shader/x-fragment" id="fs">
            #version 300 es
#ifdef GL_ES
precision highp float;
precision highp int;
precision mediump sampler3D;
#endif
#define HW_PERFORMANCE 1
uniform vec3      iResolution;
uniform float     iTime;
uniform float     iChannelTime[4];
uniform vec4      iMouse;
uniform vec4      iDate;
uniform float     iSampleRate;
uniform vec3      iChannelResolution[4];
uniform int       iFrame;
uniform float     iTimeDelta;
uniform float     iFrameRate;
void mainImage( out vec4 c, in vec2 f );
void st_assert( bool cond );
void st_assert( bool cond, int v );

out vec4 shadertoy_out_color;
void st_assert( bool cond, int v ) {if(!cond){if(v==0)shadertoy_out_color.x=-1.0;else if(v==1)shadertoy_out_color.y=-1.0;else if(v==2)shadertoy_out_color.z=-1.0;else shadertoy_out_color.w=-1.0;}}
void st_assert( bool cond        ) {if(!cond)shadertoy_out_color.x=-1.0;}
void main( void ){shadertoy_out_color = vec4(1.0,1.0,1.0,1.0);vec4 color = vec4(1e20);mainImage( color, gl_FragCoord.xy );if(shadertoy_out_color.x<0.0) color=vec4(1.0,0.0,0.0,1.0);if(shadertoy_out_color.y<0.0) color=vec4(0.0,1.0,0.0,1.0);if(shadertoy_out_color.z<0.0) color=vec4(0.0,0.0,1.0,1.0);if(shadertoy_out_color.w<0.0) color=vec4(1.0,1.0,0.0,1.0);shadertoy_out_color = vec4(color.xyz,1.0);}
        </script>
</head>

<body>
    <canvas id="canvas">

    </canvas>
    <script>)" <<
                              content <<
                              R"(
    </script>
</body>

</html>)";
                       } else {

                           std::string data;

                           render_markdown(content
                                                   .

                                                           data(), content

                                                   .

                                                           size(), data

                           );

                           ss << R"(<!DOCTYPE html>
                    <html lang="en">

                    <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>)" << title << R"(</title>
                    </head>

                    <body>)" << data << R"(</body>

                    </html>)";
                       }

                       std::string output_text = std::regex_replace(ss.str(), std::regex("// file\\d+"),
                                                                    [](const std::smatch &m) {
                                                                        static const char query[]
                                                                                = R"(SELECT content FROM svg where id = ?1)";
                                                                        db::QueryResult fetch_row = db::query<query>(
                                                                                SubstringAfterLast(m.str(0),
                                                                                                   "file"));
                                                                        std::string content;
                                                                        if (fetch_row(content)) {
                                                                            return content;
                                                                        }
                                                                        return std::string{};
                                                                    }
                       );
                       res.set_content(output_text, "text/html");

                   }
               }

    );
    server.Get("/file", [&t, &d](
            const httplib::Request &req, httplib::Response
    &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto id = req.get_param_value("id");
        static const char query[]
                = R"(select title, content from svg WHERE id = ?1)";
        db::QueryResult fetch_row = db::query<query>(id);
        std::string_view title, content;
        if (
                fetch_row(title, content
                )) {
            auto contentType = httplib::detail::find_content_type({title.data(), title.size()}, t,
                                                                  d);
            if (contentType.

                    empty()

                    ) {
                contentType = "application/octet-stream";
            }
            res.set_content({
                                    content.

                                            data(), content

                                            .

                                                    size()

                            }, contentType);
        }
    });

    server.Get("/trans", [](
            const httplib::Request &req, httplib::Response
    &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto q = req.get_param_value("q");
        auto to = req.get_param_value("to");
//LOGE("=========%s",EncodeUrl(q).c_str());
        auto s = Trans(q, to);
        res.
                set_content(s,
                            "application/json");
    });
    server.Post("/svgtag", [](
            const httplib::Request &req, httplib::Response
    &res,
            const httplib::ContentReader &content_reader
    ) {
        res.set_header("Access-Control-Allow-Origin", "*");

        std::string body;
        content_reader([&](
                const char *data, size_t
        data_length) {
            body.
                    append(data, data_length
            );
            return true;
        });
        nlohmann::json doc = nlohmann::json::parse(body);

        int id = 0;
        if (doc.contains("id")) {
            id = doc["id"];
        }
        if (id == 0) {
            res.
                    status = 404;
            return;
        }
        std::vector<std::string> names = doc["names"];
        if (names.empty()) {
            res.status = 404;
            return;
        }
        static const char query[] = R"(delete from svg_tag where svg_id =?1)";
        db::query<query>(id);
        for (
            auto i
                : names) {
            static const char q1[]
                    = R"(select id from tag where name =?1)";
            static const char q2[]
                    = R"(insert into svg_tag(svg_id,tag_id) values(?1,?2))";

            static const char q3[]
                    = R"(insert into tag(name) values(?1))";
            db::QueryResult fetch_row = db::query<q1>(i);
            std::string tag_id;
            if (!
                    fetch_row(tag_id)
                    ) {
                db::query<q3>(i);
            }
            fetch_row = db::query<q1>(i);
            if (
                    fetch_row(tag_id)
                    ) {
                db::query<q2>(std::to_string(id), tag_id
                );
            }
        }


    });
    server.Get("/svgtags", [](
            const httplib::Request &req, httplib::Response
    &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        auto id = req.get_param_value("id");
        if (id.

                empty()

                ) {
            static const char query[]
                    = R"(select name FROM tag)";
            db::QueryResult fetch_row = db::query<query>();
            std::string_view name;
            nlohmann::json doc = nlohmann::json::array();
            while (
                    fetch_row(name)
                    ) {
                doc.
                        push_back(name);
            }
            res.
                    set_content(doc
                                        .

                                                dump(),

                                "application/json");
            return;
        } else {
//            static const char q1[]
//                    = R"(delete FROM tag where id<>164)";
//            db::query<q1>();

//            static const char q1[]
//                    = R"(delete FROM tag where name='代码段')";
//            db::query<q1>();
            static const char query[]
                    = R"(select name FROM tag JOIN svg_tag on tag.id = svg_tag.tag_id where svg_tag.svg_id=$1)";
            db::QueryResult fetch_row = db::query<query>(id);
            std::string_view name;
            nlohmann::json doc = nlohmann::json::array();
            while (
                    fetch_row(name)
                    ) {
                doc.
                        push_back(name);
            }
            res.
                    set_content(doc
                                        .

                                                dump(),

                                "application/json");
        }

    });
    server.Post("/picture", [&](
            const auto &req,
            auto &res
    ) {
        handleImagesUpload(req, res
        );
    });
    server.Get("/gemini", [](
            const httplib::Request &req, httplib::Response
    &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        handleGemini(req, res
        );
    });
    server.Get("/download", [](
            const httplib::Request &req, httplib::Response
    &res) {
        std::vector<unsigned char> zip_vect;
        zipper::Zipper zipper(zip_vect);
        auto id = req.has_param("id") ? req.get_param_value("id") : "1";
        auto dir = "/storage/emulated/0/.editor/images/" + id;
//        if (is_directory(path)) {
//            Zipper zipper(path.parent_path().string() + "/" +
//                          path.filename().string() + ".epub");
        auto length = dir.length() + 1;
        for (
            const fs::directory_entry &dir_entry
                :
                fs::recursive_directory_iterator(dir)
                ) {
            if (dir_entry.

                    is_regular_file()

                    ) {
                std::ifstream input(dir_entry.path());
                zipper.
                        add(input, dir_entry
                        .

                                path()

                        .

                                string()

                        .
                                substr(length)
                );
            }

        }

        static const char query[]
                = R"(select title, content, create_at, update_at from svg WHERE id = ?1)";
        db::QueryResult fetch_row = db::query<query>(id);
        std::string_view title, content, create_at, update_at;

        if (
                fetch_row(title, content, create_at, update_at
                )) {

            std::istringstream is(fmt::format("# {}\r\n\r\n{}", title, content));
            zipper.
                    add(is,
                        "1.md", zipper::Zipper::Faster);
        }

        zipper.

                close();

//        }
//        std::vector<unsigned char> zip_vect;
//        Zipper zipper(zip_vect);
//        for (const fs::directory_entry &dir_entry:
//                fs::recursive_directory_iterator(path)) {
//            if (dir_entry.is_regular_file()) {
//                std::ifstream input(dir_entry.path());
//                zipper.add(input,
//                dir_entry.path().string().substr(path.length() + 1));
//            }
//
//        }
        std::string value{"attachment; filename=\""};
        value.
                append(SubstringAfterLast(dir, "/")
        );
        value.append(".zip\"");
        res.set_header("Content-Disposition", value);
        res.set_content(reinterpret_cast
                                <char *>(zip_vect
                                        .

                                                data()

                        ),
                        zip_vect.

                                size(),

                        "application/octet-stream");
    });
    server.Get("/image", [](
            const httplib::Request &req, httplib::Response
    &resvv) {
        resvv.set_header("Access-Control-Allow-Origin", "*");
        auto q = req.get_param_value("q");
//auto name = SubstringBeforeLast(q, "?");
//name = SubstringAfterLast(name, "/");
        auto host = Substring(q, "://", "/");
        auto query = SubstringAfterLast(q, host);
//        auto id = req.has_param("id") ? req.get_param_value("id") : "1";
//        auto dir = "/storage/emulated/0/.editor/images/" + id;
//        if (!fs::is_directory(dir))
//            fs::create_directory(dir);
        if (q.starts_with("https://")) {
            httplib::SSLClient cli(host, 443);
            cli.enable_server_certificate_verification(false);
            if (
                    auto res = cli.Get(
                            query,
                            {{"User-Agent",
                              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"}})
                    ) {
//std::ofstream file(dir + "/" + name, std::ios::binary);
//file << res->body;
                auto s = uploadImage(res->body, std::string{"1.jpg"});
                resvv.
                        set_content(s,
                                    "text/plain");
            }
        } else {
            httplib::Client cli(host, 80);
            if (
                    auto res = cli.Get(
                            query,
                            {{"User-Agent",
                              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"}})
                    ) {

//                std::ofstream file(dir + "/" + name, std::ios::binary);
//                file << res->body;
                auto s = uploadImage(res->body, std::string{"1.jpg"});
                resvv.
                        set_content(s,
                                    "text/plain");
            }
        }

// res.set_content(dir + "/" + name, "application/json");
    });


    server.
            listen(host, port
    );
}