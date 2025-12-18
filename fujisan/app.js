const { useState, useEffect } = React;

function FujiCompass() {
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [arMode, setArMode] = useState(false);
  const [stream, setStream] = useState(null);

  // 富士山の座標
  const FUJI_LAT = 35.3606;
  const FUJI_LON = 138.7274;

  // 2点間の方位角を計算
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // 2点間の距離を計算（km）
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 位置情報取得
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報に対応していません');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lon: longitude });
        
        const bear = calculateBearing(latitude, longitude, FUJI_LAT, FUJI_LON);
        setBearing(bear);
        
        const dist = calculateDistance(latitude, longitude, FUJI_LAT, FUJI_LON);
        setDistance(dist);
        
        setError('');
      },
      (err) => {
        setError('位置情報の取得に失敗しました。設定で位置情報を許可してください。');
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // デバイスの向き取得
  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setPermissionGranted(true);
          startOrientationTracking();
        }
      } catch (err) {
        setError('コンパス機能の許可が必要です');
      }
    } else {
      setPermissionGranted(true);
      startOrientationTracking();
    }
  };

  const startOrientationTracking = () => {
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);
  };

  const handleOrientation = (event) => {
    let alpha = event.alpha;
    const beta = event.beta;   // 前後の傾き
    const gamma = event.gamma; // 左右の傾き
    
    if (event.webkitCompassHeading) {
      alpha = event.webkitCompassHeading;
    } else if (alpha !== null) {
      alpha = 360 - alpha;
    }
    if (alpha !== null) {
      setHeading(alpha);
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
      // カメラストリームのクリーンアップ
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // 矢印の回転角度（富士山の方位 - デバイスの向き）
  const arrowRotation = bearing - heading;

  // ARモード切り替え
  const toggleArMode = async () => {
    if (!arMode) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setStream(mediaStream);
        setArMode(true);
      } catch (err) {
        setError('カメラへのアクセスが拒否されました');
      }
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setArMode(false);
    }
  };

  // カメラ映像の更新
  useEffect(() => {
    if (stream && arMode) {
      const video = document.getElementById('ar-video');
      if (video) {
        video.srcObject = stream;
      }
    }
  }, [stream, arMode]);

  // Lucide Reactのアイコンを手動で実装
  const Mountain = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
    </svg>
  );

  const Navigation = ({ className, fill }) => (
    <svg className={className} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  );

  const MapPin = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-200 flex flex-col items-center justify-center p-4">
      {!arMode ? (
        // 通常モード
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <button 
              onClick={toggleArMode}
              className="mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform"
            >
              <Mountain className="w-16 h-16 text-blue-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">富士山コンパス</h1>
            <p className="text-gray-600 text-sm">どこにいても富士山の方角がわかる</p>
          </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        {!permissionGranted && (
          <button
            onClick={requestOrientationPermission}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl mb-6 transition-colors"
          >
            コンパス機能を開始
          </button>
        )}

        {position && permissionGranted && (
          <>
            <div className="relative w-64 h-64 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full border-8 border-blue-300 shadow-inner">
                {/* 方位記号（回転する） */}
                <div
                  className="absolute inset-0 transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${-heading}deg)` }}
                >
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600">
                    N
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-400">
                    S
                  </div>
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">
                    W
                  </div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">
                    E
                  </div>
                </div>
                
                {/* 矢印（富士山の方向を指す） */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${arrowRotation}deg)` }}
                  >
                    <Navigation className="w-24 h-24 text-red-500 drop-shadow-lg" fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>

            {distance && (
              <div className="bg-blue-50 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    富士山までの距離
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {distance.toFixed(1)} km
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    方位角
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {bearing.toFixed(0)}°
                  </span>
                </div>

                <div className="pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-500 text-center">
                    現在地: {position.lat.toFixed(4)}°, {position.lon.toFixed(4)}°
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>スマートフォンを水平に持って</p>
          <p>矢印の方向に富士山があります</p>
          <p className="mt-2 text-blue-600">💡 山のアイコンをタップでARモード</p>
        </div>
      </div>
      ) : (
        // ARモード
        <div className="relative w-full h-screen overflow-hidden bg-black">
          <video
            id="ar-video"
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* AR オーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* 3D風矢印（中央固定・回転のみ） */}
            <div
              className="transition-transform duration-300 ease-out"
              style={{ 
                transform: `rotate(${arrowRotation}deg)`,
                perspective: '1000px'
              }}
            >
              <div style={{
                transform: 'rotateX(60deg)',
                transformStyle: 'preserve-3d'
              }}>
                {/* 矢印の影 */}
                <div className="absolute" style={{
                  transform: 'translateZ(-20px) scale(0.9)',
                  opacity: 0.3,
                  filter: 'blur(8px)'
                }}>
                  <Navigation className="w-40 h-40 text-black" fill="currentColor" />
                </div>
                {/* メインの矢印 */}
                <Navigation className="w-40 h-40 text-red-500 drop-shadow-2xl" fill="currentColor" style={{
                  filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8))'
                }} />
              </div>
            </div>
          </div>
          
          {/* 情報パネル（下部中央） */}
          {distance && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div className="bg-black bg-opacity-70 text-white rounded-2xl px-8 py-5 backdrop-blur-sm border border-white border-opacity-20">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2 text-red-400">
                    {distance.toFixed(1)} km
                  </div>
                  <div className="text-base opacity-90">
                    富士山まで {bearing.toFixed(0)}° 🗻
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 閉じるボタン */}
          <button
            onClick={toggleArMode}
            className="absolute top-6 right-6 bg-white bg-opacity-90 text-gray-800 rounded-full p-4 shadow-lg hover:bg-opacity-100 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* 3D風コンパス（楕円形・のぞき込む角度） */}
          <div className="absolute top-6 left-6 w-32 h-20">
            <div className="relative w-full h-full" style={{
              perspective: '500px'
            }}>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-gray-300 rounded-full border-4 border-gray-400 shadow-2xl" style={{
                transform: 'rotateX(60deg)',
                transformStyle: 'preserve-3d',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.3)'
              }}>
                <div
                  className="absolute inset-0 transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${-heading}deg)` }}
                >
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-red-600">
                    N
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-500">
                    S
                  </div>
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-500">
                    W
                  </div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-500">
                    E
                  </div>
                </div>
                {/* コンパスの針 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-10 bg-red-600 rounded-full" style={{
                    transformOrigin: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<FujiCompass />, document.getElementById('root'));
