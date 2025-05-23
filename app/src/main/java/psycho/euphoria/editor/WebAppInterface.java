package psycho.euphoria.editor;

import android.app.DownloadManager;
import android.app.DownloadManager.Request;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.media.MediaScannerConnection.MediaScannerConnectionClient;
import android.net.Uri;
import android.os.Environment;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.Proxy.Type;
import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;

public class WebAppInterface {

    private MainActivity mContext;
    SharedPreferences mSharedPreferences;

    public WebAppInterface(MainActivity context) {
        mContext = context;
        mSharedPreferences = PreferenceManager.getDefaultSharedPreferences(context);
    }

    public static Intent buildSharedIntent(Context context, File imageFile) {
        Intent sharingIntent = new Intent(Intent.ACTION_SEND);
        // https://android.googlesource.com/platform/frameworks/base/+/61ae88e/core/java/android/webkit/MimeTypeMap.java
        sharingIntent.setType(MimeTypeMap.getSingleton().getMimeTypeFromExtension(Shared.substringAfterLast(imageFile.getName(), ".")));
        Uri uri = PublicFileProvider.getUriForFile(context, "psycho.euphoria.app.files", imageFile);
        sharingIntent.putExtra(Intent.EXTRA_STREAM, uri);
        return sharingIntent;


    }


    @JavascriptInterface
    public void downloadFile(String fileName, String uri) {
        try {
            DownloadManager dm = (DownloadManager) mContext.getSystemService(Context.DOWNLOAD_SERVICE);
            Request request = new Request(Uri.parse(uri));
//            request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI | DownloadManager.Request.NETWORK_MOBILE)
//                    .setAllowedOverRoaming(false)
//                    .setTitle(fileName)
//                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_ONLY_COMPLETION)
//                    .setVisibleInDownloadsUi(false);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            dm.enqueue(request);
        } catch (Exception ignored) {
            Log.e("B5aOx2", String.format("downloadFile, %s", ignored.getMessage()));
        }

    }

    @JavascriptInterface
    public String getString(String key) {
        return mSharedPreferences.getString(key, "");
    }

    @JavascriptInterface
    public String getVideoAddress(String url) {
        AtomicReference<String> result = new AtomicReference<>();
        Thread thread = new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                String res = Shared.readString(connection);
                res = Shared.substringAfter(res, "sl: \"");
                res = Shared.substringBefore(res, "\"");
                result.set(res);
            } catch (Exception ignored) {
            }
        });
        thread.start();
        try {
            thread.join();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        return result.get();
    }

    @JavascriptInterface
    public void launchApp(String id)
    {
        mContext.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mContext.loadUrl(id);
            }
        });
    }

    @JavascriptInterface
    public void launchApp(String text, String uri) {
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        //intent.setPackage("psycho.euphoria.l");
        intent.setClassName("psycho.euphoria.l",
                "psycho.euphoria.l.MainActivity");
        if (uri.startsWith("https://") || uri.startsWith("http://"))
            intent.setData(Uri.parse(uri));
        else
            intent.setData(Uri.parse(String.format("http://%s:8090%s", Shared.getDeviceIP(mContext), uri)));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        mContext.startActivity(intent);//null pointer check in case package name was not found

    }

    @JavascriptInterface
    public String listAllPackages() {
        // get list of all the apps installed
        List<ApplicationInfo> infos = mContext.getPackageManager().getInstalledApplications(PackageManager.GET_META_DATA);
        // create a list with size of total number of apps
        String[] apps = new String[infos.size()];
        int i = 0;
        // add all the app name in string list
        for (ApplicationInfo info : infos) {
            apps[i] = info.packageName;
            i++;
        }
        return Arrays.stream(apps).sorted(String::compareTo).collect(Collectors.joining("\n"));
    }

    @JavascriptInterface
    public void openFile(String path) {
        mContext.runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.fromFile(new File(path)), MimeTypeMap.getSingleton().getMimeTypeFromExtension(Shared.substringAfterLast(path, ".")));
            mContext.startActivity(Intent.createChooser(intent, "打开"));
        });
    }

    @JavascriptInterface
    public String readText() {
        ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clipData = clipboard.getPrimaryClip();
        if (clipData.getItemCount() > 0) {
            CharSequence sequence = clipboard.getPrimaryClip().getItemAt(0).getText();
            if (sequence != null) return sequence.toString();
        }
        return null;
    }

    @JavascriptInterface
    public void scanFile(String fileName) {
        MediaScannerConnection.scanFile(mContext, new String[]{fileName}, new String[]{MimeTypeMap.getSingleton().getMimeTypeFromExtension(Shared.substringAfterLast(fileName, "."))}, new MediaScannerConnectionClient() {
            @Override
            public void onMediaScannerConnected() {
                Log.e("B5aOx2", String.format("onMediaScannerConnected, %s", ""));
            }

            @Override
            public void onScanCompleted(String s, Uri uri) {
            }
        });
    }

    @JavascriptInterface
    public void setString(String key, String value) {
        mSharedPreferences.edit().putString(key, value).apply();
    }

    @JavascriptInterface
    public void share(String path) {
        try {
            mContext.startActivity(buildSharedIntent(mContext, new File(path)));
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void switchInputMethod() {
        ((InputMethodManager) mContext.getSystemService(Context.INPUT_METHOD_SERVICE)).showInputMethodPicker();
    }

    @JavascriptInterface
    public String translate(String s, String to) {
        final StringBuilder sb = new StringBuilder();
        try {
            Thread thread = new Thread(() -> {
                String uri = "http://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=" + to + "&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=" + Uri.encode(s);
                try {
                    HttpURLConnection h = (HttpURLConnection) new URL(uri).openConnection(new Proxy(Type.HTTP, new InetSocketAddress("127.0.0.1", 10809)));
                    h.addRequestProperty("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74");
                    h.addRequestProperty("Accept-Encoding", "gzip, deflate, br");
                    String line = null;
                    BufferedReader reader = new BufferedReader(new InputStreamReader(new GZIPInputStream(h.getInputStream())));
                    StringBuilder sb1 = new StringBuilder();
                    while ((line = reader.readLine()) != null) {
                        sb1.append(line).append('\n');
                    }
                    JSONObject object = new JSONObject(sb1.toString());
                    JSONArray array = object.getJSONArray("sentences");
                    for (int i = 0; i < array.length(); i++) {
                        sb.append(array.getJSONObject(i).getString("trans"));
                    }
                } catch (Exception e) {
                }
            });
            thread.start();
            thread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return sb.toString();
    }

    @JavascriptInterface
    public void writeText(String text) {
        ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("demo", text);
        clipboard.setPrimaryClip(clip);
    }


    private static void openLocalPage(Context context, String path) {
        PackageManager pm = context.getPackageManager();
        Intent launchIntent = pm.getLaunchIntentForPackage("com.android.chrome");
        launchIntent.setData(Uri.parse("http://" + Shared.getDeviceIP(context) + ":8500" + path));
        context.startActivity(launchIntent);
    }


    @JavascriptInterface
    public String getTitle(String uri) {
        final StringBuilder sb = new StringBuilder();
        try {
            Thread thread = new Thread(() -> {
                try {
                    HttpURLConnection h = (HttpURLConnection) new URL(uri).openConnection();
                    h.addRequestProperty("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74");
                    String s = Shared.readString(h);
                    s = Shared.substringAfter(s, "<title>");
                    s = Shared.substringBefore(s, "</title>");
                    sb.append(s);
                } catch (Exception e) {
                }
            });
            thread.start();
            thread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return sb.toString();
    }

    @JavascriptInterface
    public void open(String s){
        mContext.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mContext.open(s);
            }
        });
    }

}