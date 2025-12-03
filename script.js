// GitHub Pagesにデプロイする際、ブラウザの言語設定に基づいて曜日を日本語で取得します。
function displayCurrentDate() {
    const now = new Date();
    
    // 曜日を日本語で取得
    const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(now);
    
    // YYYY/MM/DD 形式の文字列を作成
    const formattedDate = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '/'); // スラッシュ区切りに修正

    // 最終的な表示形式 (例: 2025/12/03 (水))
    const dateString = `${formattedDate} (${weekday})`;
    
    // HTMLの要素に日付を挿入
    const dateElement = document.getElementById('dateDisplay');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}


/**
 * リストファイル（urls.txt）を取得し、ランダムなURLにリダイレクトする関数
 */
async function getRandomUrlAndRedirect() {
    // 1. ファイルの取得
    try {
        const response = await fetch('urls.txt');
        if (!response.ok) {
            throw new Error(`ファイルの読み込みに失敗しました: ${response.status}`);
        }
        
        const text = await response.text();
        
        // 2. リストの解析とフィルタリング
        const urlList = text.split('\n')
            .map(url => url.trim())
            .filter(url => url !== '' && !url.startsWith('#')); 

        if (urlList.length === 0) {
            alert('URLリストが空か、有効なURLがありません。');
            return;
        }

        // 3. ランダムなURLの選択
        const randomIndex = Math.floor(Math.random() * urlList.length);
        const randomUrl = urlList[randomIndex];
        
        // 4. ページ遷移（リダイレクト）
        console.log(`ランダムに選択されたURL: ${randomUrl}`);
        window.location.href = randomUrl;

    } catch (error) {
        console.error("エラーが発生しました:", error);
        alert('URLの取得中にエラーが発生しました。コンソールを確認してください。');
    }
}

// ページが完全に読み込まれた後に日付表示処理を実行
window.onload = function() {
    displayCurrentDate();
};
