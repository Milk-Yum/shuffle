// --- 設定値 ---
const DRAWN_URLS_KEY = 'tarotDrawnStars'; 
const DRAWN_URLS_LIMIT = 20;            
const RESET_TIME_KEY = 'tarotStarResetTime'; 
let resetTimer = null; 

// ----------------------------------------------------
// ユーティリティ: 次のリセット時間を計算
// ----------------------------------------------------
function getNextResetTime() {
    const now = new Date();
    const currentHour = now.getHours();
    
    let nextReset = new Date(now);
    
    // 現在時刻が0時〜12時未満の場合、次のリセットは今日の12時
    if (currentHour < 12) {
        nextReset.setHours(12, 0, 0, 0); // 12:00:00.000
    } 
    // 現在時刻が12時〜24時未満の場合、次のリセットは翌日の0時
    else {
        // 日付を次の日に進め、時間を0時に設定
        nextReset.setDate(now.getDate() + 1); 
        nextReset.setHours(0, 0, 0, 0); // 翌日 00:00:00.000
    }
    
    return nextReset.getTime(); // ミリ秒で返す
}

// ----------------------------------------------------
// ページ読み込み時に日付を表示
// ----------------------------------------------------
function displayCurrentDate() {
    const now = new Date();
    
    // 月と日の表示からゼロ詰めを削除
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // 曜日を日本語で取得
    const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(now);
    
    // 形式を YYYY/M/D (曜日) に修正
    const dateString = `${year}/${month}/${day} (${weekday})`;
    
    const dateElement = document.getElementById('dateDisplay');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// ----------------------------------------------------
// 強制リセット処理
// ----------------------------------------------------
function forceReset() {
    if (confirm("本当に星をリセットして、すぐに新しいカードを引きますか？\n（本日の星はリセットされます）")) {
        if (resetTimer) clearInterval(resetTimer); 
        
        localStorage.removeItem(DRAWN_URLS_KEY);
        localStorage.removeItem(RESET_TIME_KEY);
        
        alert("星をリセットしました。再度カードを引いてください。");
        window.location.reload();
    }
}

// ----------------------------------------------------
// 抽選待ちメッセージを表示する関数
// ----------------------------------------------------
function showWaitMessage(resetTime) {
    const now = new Date();
    let diffMs = resetTime - now.getTime(); 
    
    if (resetTimer) {
        clearInterval(resetTimer);
    }
    
    if (diffMs <= 0) {
        // リセット時間を過ぎていた場合、強制リセット
        localStorage.removeItem(DRAWN_URLS_KEY);
        localStorage.removeItem(RESET_TIME_KEY);
        alert("星を引くことが可能になりました。ページを更新します。");
        window.location.reload();
        return;
    }

    const resetDate = new Date(resetTime);
    
    // 月、日、時の表示からゼロ詰めを削除
    const resetDateString = resetDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'numeric', 
        day: 'numeric',   
        weekday: 'short'
    }).replace(/\//g, '/'); 
    const resetTimeString = resetDate.toLocaleTimeString('ja-JP', { 
        hour: 'numeric',  
        minute: '2-digit', 
        hour12: false 
    }); 
    
    const resetDateTimeCombined = `${resetDateString} ${resetTimeString}`;
    
    const container = document.querySelector('.container');
    
    resetTimer = setInterval(() => {
        const now = new Date();
        diffMs = resetTime - now.getTime();
        
        if (diffMs <= 0) {
            clearInterval(resetTimer);
            showWaitMessage(0); 
            return;
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        // ★ 修正: カウントダウンのゼロ詰めを削除
        const remainingTimeText = `${hours}時間 ${minutes}分 ${seconds}秒`;
        
        if (container) {
            container.innerHTML = `
                <div id="dateDisplay"></div>
                <h1>：ワンオラクル：<br>タロット占い</h1>
                <p style="color: red; font-size: 20px;">カードの浄化が必要になりました</p>
                <p style="margin-top: 30px;">
                    <strong>星の回復まで</strong><br>
                    <strong>${remainingTimeText}</strong><br>
                    お待ちください。
                </p>
                
                <p style="font-size: 14px; margin-top: 10px; white-space: nowrap;">
                    リセット日時：<br><strong>${resetDateTimeCombined}</strong>
                </p>

                <button onclick="forceReset()" style="
                    margin-top: 40px; 
                    background-color: #f0f0f0; 
                    color: #555; 
                    border: 1px solid #ccc;
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 5px;
                ">
                    ★今すぐリセット★
                </button>
            `;
            displayCurrentDate(); 
        }

    }, 1000); 
}


/**
 * メインの抽選処理
 */
async function getRandomUrlAndRedirect() {
    const savedResetTime = localStorage.getItem(RESET_TIME_KEY);
    const nowTimestamp = new Date().getTime();
    
    // 1. リセット時間チェック
    if (savedResetTime && nowTimestamp < parseInt(savedResetTime, 10)) {
        showWaitMessage(parseInt(savedResetTime, 10));
        return;
    } 
    
    if (savedResetTime && nowTimestamp >= parseInt(savedResetTime, 10)) {
        if (resetTimer) clearInterval(resetTimer);
        localStorage.removeItem(DRAWN_URLS_KEY);
        localStorage.removeItem(RESET_TIME_KEY);
    }
    
    // 2. 抽選処理の開始
    try {
        const response = await fetch('urls.txt', { cache: 'no-store' }); 
        
        if (!response.ok) {
            alert(`URLリストの読み込みに失敗しました (Status: ${response.status})。ファイル名を確認してください。`);
            throw new Error(`ファイル読み込みエラー: ${response.status}`);
        }
        
        const text = await response.text();
        const urlList = text.split('\n')
            .map(url => url.trim())
            .filter(url => url !== '' && !url.startsWith('#')); 

        // 3. 履歴の読み込みと抽選リストの作成
        let drawnUrls = JSON.parse(localStorage.getItem(DRAWN_URLS_KEY) || '[]');
        const eligibleUrls = urlList.filter(url => !drawnUrls.includes(url));

        if (eligibleUrls.length === 0) {
            // 4A. 抽選可能なURLがない場合
            
            // リセット時間を固定値（次の0時/12時）に設定
            const resetTime = getNextResetTime();
            localStorage.setItem(RESET_TIME_KEY, resetTime);
            
            // 待機メッセージを表示
            showWaitMessage(resetTime);
            return;
        }

        // 4B. ランダムなURLの選択
        const randomIndex = Math.floor(Math.random() * eligibleUrls.length);
        const randomUrl = eligibleUrls[randomIndex];
        
        // 5. 履歴の更新と保存
        drawnUrls.push(randomUrl);
        if (drawnUrls.length > DRAWN_URLS_LIMIT) {
            drawnUrls = drawnUrls.slice(drawnUrls.length - DRAWN_URLS_LIMIT);
        }
        localStorage.setItem(DRAWN_URLS_KEY, JSON.stringify(drawnUrls));
        
        // 6. ページ遷移
        window.location.href = randomUrl;

    } catch (error) {
        console.error("エラーが発生しました:", error);
        alert('エラーが発生しました。コンソールを確認してください。');
    }
}

// ページが完全に読み込まれた後に日付表示処理と待機状態チェックを実行
window.onload = function() {
    displayCurrentDate();
    
    const savedResetTime = localStorage.getItem(RESET_TIME_KEY);
    const nowTimestamp = new Date().getTime();
    if (savedResetTime && nowTimestamp < parseInt(savedResetTime, 10)) {
        showWaitMessage(parseInt(savedResetTime, 10));
    }
};
