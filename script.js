// script.js

// 抽選に使用するURLリストのファイルパス
const URL_LIST_FILE = 'urls.txt';

// 最大抽選回数を設定（この回数に達すると「浄化/リセット」画面が表示されます）
const MAX_DRAWS = 10;

// 過去の抽選URLを保存するLocalStorageのキー
const DRAWN_URLS_KEY = 'drawnUrls';

// 抽選回数を保存するLocalStorageのキー
const DRAW_COUNT_KEY = 'drawCount';


// --- ユーティリティ関数 ---

/**
 * LocalStorageから抽選履歴を取得する。
 * @returns {string[]} 抽選されたURLの配列
 */
function getDrawnUrls() {
    const json = localStorage.getItem(DRAWN_URLS_KEY);
    return json ? JSON.parse(json) : [];
}

/**
 * LocalStorageに抽選履歴を保存する。
 * @param {string[]} urls - 抽選されたURLの配列
 */
function setDrawnUrls(urls) {
    localStorage.setItem(DRAWN_URLS_KEY, JSON.stringify(urls));
}

/**
 * LocalStorageから抽選回数を取得する。
 * @returns {number} 現在の抽選回数
 */
function getDrawCount() {
    const count = localStorage.getItem(DRAW_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
}

/**
 * LocalStorageに抽選回数を保存する。
 * @param {number} count - 現在の抽選回数
 */
function setDrawCount(count) {
    localStorage.setItem(DRAW_COUNT_KEY, count.toString());
}

/**
 * 抽選履歴と回数をすべてリセットする。
 */
function resetDrawData() {
    setDrawnUrls([]);
    setDrawCount(0);
    // ユーザーにリセット完了を知らせる（必要であれば）
    console.log("抽選履歴と回数がリセットされました。");
}


// --- メインロジック ---

/**
 * URLリストファイルから全URLを読み込む。
 * @returns {Promise<string[]>} 全URLの配列
 */
async function loadUrls() {
    try {
        const response = await fetch(URL_LIST_FILE);
        if (!response.ok) {
            throw new Error(`Failed to load ${URL_LIST_FILE}: ${response.statusText}`);
        }
        const text = await response.text();
        // 空行や空白のみの行をフィルタリングして配列化
        return text.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    } catch (error) {
        console.error("URLリストの読み込み中にエラーが発生しました:", error);
        alert("カードリストの読み込みに失敗しました。ファイルが存在するか確認してください。");
        return [];
    }
}

/**
 * カードを抽選し、そのURLへリダイレクトする。
 */
async function getRandomUrlAndRedirect() {
    const allUrls = await loadUrls();
    let drawnUrls = getDrawnUrls();
    let drawCount = getDrawCount();

    // 1. 最大抽選回数のチェック
    if (drawCount >= MAX_DRAWS) {
        // 最大回数に達した場合、浄化画面へリダイレクト
        window.location.href = 'purge.html'; 
        return;
    }

    // 2. まだ引かれていないURLを抽出
    const eligibleUrls = allUrls.filter(url => !drawnUrls.includes(url));

    // 3. 抽選処理
    let selectedUrl;

    if (eligibleUrls.length > 0) {
        // まだ引かれていないURLからランダムに選択
        const randomIndex = Math.floor(Math.random() * eligibleUrls.length);
        selectedUrl = eligibleUrls[randomIndex];

        // 抽選履歴に追加
        drawnUrls.push(selectedUrl);
        setDrawnUrls(drawnUrls);

        // 抽選回数をインクリメントして保存
        drawCount++;
        setDrawCount(drawCount);

        // 選択されたURLへリダイレクト
        window.location.href = selectedUrl;

    } else {
        // 4. すべてのURLを引ききった場合 (通常、このルートは drawCount >= MAX_DRAWS が先に処理するため通らないが、保険として)
        console.warn("すべてのカードを引ききりました。リセットが必要です。");
        window.location.href = 'purge.html'; 
    }
}

// ボタンクリック時のイベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
    const drawButton = document.getElementById('draw-card-button');
    if (drawButton) {
        drawButton.addEventListener('click', getRandomUrlAndRedirect);
    }
    
    // purge.html にリセットボタンがある場合、そのイベントを設定する
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetDrawData();
            // リセット後、元の抽選画面に戻る
            window.location.href = 'index.html'; 
        });
    }

    // 抽選回数を表示する（デバッグ用やユーザー向け）
    const countDisplay = document.getElementById('draw-count-display');
    if (countDisplay) {
        countDisplay.textContent = `現在の抽選回数: ${getDrawCount()} / ${MAX_DRAWS}`;
    }
});
