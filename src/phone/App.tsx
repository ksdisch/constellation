import { RoomJoin } from './components/RoomJoin';

export function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <RoomJoin
          onJoin={(code) => {
            console.log('join room', code);
          }}
        />
      </div>
    </div>
  );
}
