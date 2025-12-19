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
        this.gravity = 0.5;      // 傾きに対する加速度
        this.friction = 0.98;    // 摩擦係数
        this.bounce = 0.6;       // 反発係数
        
        // ボールサイズ
        this.ballSize = 50;
        
        // 傾きデータ
        this.tiltX = 0;
        this.tiltY = 0;
        
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        // 初期位置（中央）
        this.x = (window.innerWidth - this.ballSize) / 2;
        this.y = (window.innerHeight - this.ballSize) / 2;
        this.updateBallPosition();
        
        // スタートボタン
        this.startBtn.addEventListener('click', () => this.start());
        
        // リサイズ対応
        window.addEventListener('resize', () => this.handleResize());
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
        // beta: 前後の傾き (-180 to 180)
        
        // 水平に持った状態を基準にする
        // gamma → X方向の移動
        // beta → Y方向の移動（水平時は約0-90度）
        
        let gamma = event.gamma || 0;  // 左右
        let beta = event.beta || 0;    // 前後
        
        // 傾きを -30〜30 度の範囲に制限して正規化
        gamma = Math.max(-30, Math.min(30, gamma));
        beta = Math.max(-30, Math.min(30, beta - 45)); // 45度を水平とする
        
        this.tiltX = gamma / 30;  // -1 to 1
        this.tiltY = beta / 30;   // -1 to 1
        
        // デバッグ表示
        this.debug.innerHTML = `
            γ(左右): ${gamma.toFixed(1)}°<br>
            β(前後): ${(event.beta || 0).toFixed(1)}°<br>
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
        const maxX = window.innerWidth - this.ballSize - 8;  // border分
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
        // 画面外に出ていたら調整
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
