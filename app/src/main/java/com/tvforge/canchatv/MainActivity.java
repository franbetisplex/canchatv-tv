package com.tvforge.canchatv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {

    private static final String START_URL = "https://canchatv.base44.app/";
    private WebView webView;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private volatile boolean playerMode = false;
    private volatile long lastClick = 0L;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0A0B0D);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setTextZoom(120);

        webView.addJavascriptInterface(new TvBridge(), "tvPlayer");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenView = view;
                fullscreenCallback = callback;

                FrameLayout container = new FrameLayout(MainActivity.this);
                container.setBackgroundColor(0xFF000000);
                container.addView(view, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));
                setContentView(container);
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String target) {
                view.loadUrl(target);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String loadedUrl) {
                super.onPageFinished(view, loadedUrl);
                playerMode = false;
                injectTvNavigation();
                if (System.currentTimeMillis() - lastClick < 20000) {
                    lastClick = 0L;
                    view.evaluateJavascript("window.__tvOpenPlayer && window.__tvOpenPlayer()", null);
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(START_URL);
    }

    private void injectTvNavigation() {
        try {
            InputStream input = getAssets().open("tv-nav.js");
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int read;
            while ((read = input.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            input.close();
            webView.evaluateJavascript(buffer.toString("UTF-8"), null);
        } catch (IOException error) {
            // Sin el script, la app sigue funcionando con el foco nativo del WebView.
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();

        if (event.getAction() == KeyEvent.ACTION_DOWN && webView != null && fullscreenView == null && !playerMode) {
            String command = null;

            if (code == KeyEvent.KEYCODE_DPAD_UP) {
                command = "up";
            } else if (code == KeyEvent.KEYCODE_DPAD_DOWN) {
                command = "down";
            } else if (code == KeyEvent.KEYCODE_DPAD_LEFT) {
                command = "left";
            } else if (code == KeyEvent.KEYCODE_DPAD_RIGHT) {
                command = "right";
            } else if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER
                    || code == KeyEvent.KEYCODE_NUMPAD_ENTER || code == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
                command = "enter";
            }

            if (command != null) {
                webView.evaluateJavascript("window.__tvNav && window.__tvNav('" + command + "')", null);
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    private void exitFullscreen() {
        if (fullscreenView == null) {
            return;
        }
        setContentView(webView);
        fullscreenView = null;
        if (fullscreenCallback != null) {
            fullscreenCallback.onCustomViewHidden();
            fullscreenCallback = null;
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (fullscreenView != null) {
                exitFullscreen();
                return true;
            }
            if (playerMode && webView != null) {
                webView.evaluateJavascript("window.__tvExitPlayer && window.__tvExitPlayer()", null);
                return true;
            }
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    public class TvBridge {
        @JavascriptInterface
        public void setPlayerMode(boolean active) {
            playerMode = active;
        }

        @JavascriptInterface
        public void markClick() {
            lastClick = System.currentTimeMillis();
        }
    }
}
