class BallGame {
    constructor() {
        this.ball = document.getElementById('ball');
        this.container = document.getElementById('container');
        this.startOverlay = document.getElementById('start-overlay');
        this.startBtn = document.getElementById('start-btn');
        this.debug = document.getElementById('debug');
        
        // ボールの状態
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        
        // 物理パラメータ
        this.gravity = 0.5;
        this.friction = 0.98;
        this.bounce = 0.6;
        
        // ボールサイズ
        this.ballSize = 50;
        
        // 傾きデータ
        this.tiltX = 0;
        this.tiltY = 0;
        
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        // 初期位置（画面の真ん中）
        this.centerBall();
        this.updateBallPosition();
        
        // スタートボタン
        this.startBtn.addEventListener('click', () => this.start());
        
        // リサイズ対応
        window.addEventListener('resize', () => this.handleResize());
    }
    
    centerBall() {
        const containerWidth = window.innerWidth - 8;  // border分
        const containerHeight = window.innerHeight - 8;
        this.x = (containerWidth - this.ballSize) / 2;
        this.y = (containerHeight - this.ballSize) / 2;
    }
    
    async start() {
        // iOS 13+ では許可が必要
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    alert('傾きセンサーの許可が必要です');
                    return;
                }
            } catch (error) {
                console.error('Permission error:', error);
                alert('センサーの許可でエラーが発生しました');
                return;
            }
        }
        
        // 傾きイベント登録
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
        
        // オーバーレイを隠す
        this.startOverlay.classList.add('hidden');
        
        // ゲームループ開始
        this.isRunning = true;
        this.gameLoop();
    }
    
    handleOrientation(event) {
        // gamma: 左右の傾き (-90 to 90)
        //   左に傾ける → 負の値 → ボールは左へ
        //   右に傾ける → 正の値 → ボールは右へ
        
        // beta: 前後の傾き (-180 to 180)
        //   水平時は約90度（画面が上向き）
        //   スマホ上部を下げる → betaが小さくなる → ボールは上へ
        //   スマホ下部を下げる → betaが大きくなる → ボールは下へ
        
        let gamma = event.gamma || 0;
        let beta = event.beta || 0;
        
        // 傾きを制限
        gamma = Math.max(-30, Math.min(30, gamma));
        
        // beta: 90度を水平基準として、そこからの差分を取る
        let betaOffset = beta - 90;
        betaOffset = Math.max(-30, Math.min(30, betaOffset));
        
        // 正規化 (-1 to 1)
        // 左傾き → tiltX負 → ボール左へ
        // 右傾き → tiltX正 → ボール右へ
        this.tiltX = gamma / 30;
        
        // 上部下げ → betaOffset負 → tiltY負 → ボール上へ
        // 下部下げ → betaOffset正 → tiltY正 → ボール下へ
        this.tiltY = betaOffset / 30;
        
        // デバッグ表示
        this.debug.innerHTML = `
            γ(左右): ${gamma.toFixed(1)}°<br>
            β(前後): ${beta.toFixed(1)}°<br>
            βOffset: ${betaOffset.toFixed(1)}°<br>
            tiltX: ${this.tiltX.toFixed(2)}<br>
            tiltY: ${this.tiltY.toFixed(2)}
        `;
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // 傾きに応じて加速
        this.vx += this.tiltX * this.gravity;
        this.vy += this.tiltY * this.gravity;
        
        // 摩擦を適用
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // 位置を更新
        this.x += this.vx;
        this.y += this.vy;
        
        // 壁との衝突判定
        const maxX = window.innerWidth - this.ballSize - 8;
        const maxY = window.innerHeight - this.ballSize - 8;
        
        // 左壁
        if (this.x < 0) {
            this.x = 0;
            this.vx = -this.vx * this.bounce;
        }
        // 右壁
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = -this.vx * this.bounce;
        }
        // 上壁
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * this.bounce;
        }
        // 下壁
        if (this.y > maxY) {
            this.y = maxY;
            this.vy = -this.vy * this.bounce;
        }
        
        this.updateBallPosition();
    }
    
    updateBallPosition() {
        this.ball.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
    
    handleResize() {
        const maxX = window.innerWidth - this.ballSize - 8;
        const maxY = window.innerHeight - this.ballSize - 8;
        
        this.x = Math.max(0, Math.min(this.x, maxX));
        this.y = Math.max(0, Math.min(this.y, maxY));
        this.updateBallPosition();
    }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
    new BallGame();
});
