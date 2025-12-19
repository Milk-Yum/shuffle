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
        
        // キャリブレーション用（スタート時のbeta値を基準にする）
        this.baseBeta = null;
        this.calibrationSamples = [];
        
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        this.centerBall();
        this.updateBallPosition();
        
        this.startBtn.addEventListener('click', () => this.start());
        window.addEventListener('resize', () => this.handleResize());
    }
    
    centerBall() {
        const containerWidth = window.innerWidth - 8;
        const containerHeight = window.innerHeight - 8;
        this.x = (containerWidth - this.ballSize) / 2;
        this.y = (containerHeight - this.ballSize) / 2;
    }
    
    async start() {
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
        
        // ボタンテキストを変更
        this.startBtn.textContent = 'キャリブレーション中...';
        this.startBtn.disabled = true;
        
        // キャリブレーション開始
        this.calibrationSamples = [];
        
        const calibrationHandler = (e) => {
            if (e.beta !== null) {
                this.calibrationSamples.push(e.beta);
            }
        };
        
        window.addEventListener('deviceorientation', calibrationHandler);
        
        // 1秒間サンプル収集
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        window.removeEventListener('deviceorientation', calibrationHandler);
        
        // 平均値を基準に
        if (this.calibrationSamples.length > 0) {
            const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
            this.baseBeta = sum / this.calibrationSamples.length;
        } else {
            this.baseBeta = 0;
        }
        
        console.log('Calibrated baseBeta:', this.baseBeta);
        
        // 傾きイベント登録
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
        
        // オーバーレイを隠す
        this.startOverlay.classList.add('hidden');
        
        // ゲームループ開始
        this.isRunning = true;
        this.gameLoop();
    }
    
    handleOrientation(event) {
        let gamma = event.gamma || 0;
        let beta = event.beta || 0;
        
        // 傾きを制限
        gamma = Math.max(-30, Math.min(30, gamma));
        
        // キャリブレーション済みの基準値からの差分
        let betaOffset = beta - this.baseBeta;
        betaOffset = Math.max(-30, Math.min(30, betaOffset));
        
        // 正規化 (-1 to 1)
        this.tiltX = gamma / 30;
        this.tiltY = betaOffset / 30;
        
        // デバッグ表示
        this.debug.innerHTML = `
            基準β: ${this.baseBeta.toFixed(1)}°<br>
            現在β: ${beta.toFixed(1)}°<br>
            βOffset: ${betaOffset.toFixed(1)}°<br>
            γ(左右): ${gamma.toFixed(1)}°<br>
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
        this.vx += this.tiltX * this.gravity;
        this.vy += this.tiltY * this.gravity;
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx;
        this.y += this.vy;
        
        const maxX = window.innerWidth - this.ballSize - 8;
        const maxY = window.innerHeight - this.ballSize - 8;
        
        if (this.x < 0) {
            this.x = 0;
            this.vx = -this.vx * this.bounce;
        }
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = -this.vx * this.bounce;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * this.bounce;
        }
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

document.addEventListener('DOMContentLoaded', () => {
    new BallGame();
});
