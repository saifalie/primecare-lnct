import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import useBleStore from '../store/bleStore';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const VITALS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const FALL_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';
const SOS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa';

const manager = new BleManager();
let connectedDevice = null;
let scanTimeout = null;
let isCurrentlyScanning = false; // GUARD

function decodeBase64(base64) {
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function requestPermissions() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
}

export async function startScan() {
  // GUARD: skip if already scanning or already connected
  if (isCurrentlyScanning) {
    console.log('BLE: already scanning, skipping');
    return;
  }
  if (connectedDevice) {
    console.log('BLE: already connected, skipping scan');
    return;
  }

  const store = useBleStore.getState();
  const granted = await requestPermissions();
  if (!granted) return;

  isCurrentlyScanning = true;
  store.setScanning(true);
  console.log('BLE: scan started');

  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      console.log('BLE scan error:', error.message);
      isCurrentlyScanning = false;
      store.setScanning(false);
      return;
    }
    if (device && (device.name === 'PrimeBand' || device.localName === 'PrimeBand')) {
      console.log('BLE: PrimeBand found, connecting...');
      stopScan();
      connectToDevice(device);
    }
  });

  scanTimeout = setTimeout(() => {
    console.log('BLE: scan timeout, will retry in 15s');
    stopScan();
    setTimeout(() => startScan(), 15000);
  }, 20000);
}

export function stopScan() {
  manager.stopDeviceScan();
  isCurrentlyScanning = false;
  useBleStore.getState().setScanning(false);
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
}

async function connectToDevice(device) {
  try {
    connectedDevice = await device.connect();
    try {
      await connectedDevice.requestMTU(185);
    } catch (e) {}
    connectedDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
    useBleStore.getState().setConnected(device.id, 'PrimeBand');
    console.log('BLE: connected to PrimeBand');

    connectedDevice.monitorCharacteristicForService(SERVICE_UUID, VITALS_UUID, (error, characteristic) => {
      if (error) return;
      try {
        const v = JSON.parse(decodeBase64(characteristic.value));
        useBleStore.getState().setVitals({
          hr: v.hr === 0 ? '--' : v.hr,
          spo2: v.sp === 0 ? '--' : (v.sp || v.spo2),
          temperature: v.tp || v.temperature,
          steps: v.st || v.steps || 0,
          battery: v.bt || v.battery || 0,
          lat: v.lat || 0,
          lng: v.lng || 0,
          gps_fixed: v.gf === 1 || v.gps_fixed || false,
        });
      } catch (e) {}
    });

    connectedDevice.monitorCharacteristicForService(SERVICE_UUID, FALL_UUID, (error, characteristic) => {
      if (error) return;
      try {
        useBleStore.getState().setLastFall(JSON.parse(decodeBase64(characteristic.value)));
      } catch (e) {}
    });

    connectedDevice.monitorCharacteristicForService(SERVICE_UUID, SOS_UUID, (error, characteristic) => {
      if (error) return;
      try {
        useBleStore.getState().setLastSOS(JSON.parse(decodeBase64(characteristic.value)));
      } catch (e) {}
    });

    connectedDevice.onDisconnected(() => {
      console.log('BLE: disconnected, retrying in 5s');
      useBleStore.getState().setDisconnected();
      connectedDevice = null;
      setTimeout(() => startScan(), 5000);
    });

  } catch (error) {
    console.log('BLE: connection failed, retrying in 10s');
    useBleStore.getState().setDisconnected();
    connectedDevice = null;
    setTimeout(() => startScan(), 10000);
  }
}

export function disconnect() {
  if (connectedDevice) {
    connectedDevice.cancelConnection();
    connectedDevice = null;
  }
  stopScan();
  useBleStore.getState().setDisconnected();
}

export default manager;
