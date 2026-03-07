# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with `[create-expo-app](https://www.npmjs.com/package/create-expo-app)`.

## Get started

1. Install dependencies
  ```bash
   npm install
  ```
2. Start the app
  ```bash
   npx expo start
  ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Run on a physical Android phone (with backend on your laptop)

To use the app on your phone while the API runs on your laptop:

1. **Same network**  
   Either: connect both phone and laptop to the same Wi‑Fi, **or** turn on **mobile hotspot on your phone** and connect the laptop to that hotspot. Both setups work the same way; in the hotspot case, use the laptop’s IP on the hotspot network (e.g. `192.168.43.2`) for `EXPO_PUBLIC_API_URL`.

2. **Backend on laptop (listens on all interfaces)**  
   In `nutrition_backend/`:
   ```bash
   python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```
   Or if your backend is started from `app.py`, ensure it uses `host="0.0.0.0"` (it already does).

3. **Your laptop’s IP**  
   On macOS/Linux: `ifconfig | grep "inet "` or `ip addr`. On Windows: `ipconfig`.  
   Use the LAN address (e.g. `192.168.1.5`), not `127.0.0.1`.

4. **Point the app at that IP**  
   Create a `.env` in this folder (or set when running):
   ```bash
   EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:8000
   ```
   Example: `EXPO_PUBLIC_API_URL=http://192.168.1.5:8000`

5. **Start Expo and open on device**  
   ```bash
   npx expo start
   ```  
   Scan the QR code with Expo Go (Android) or run the build on your device. The app will use the URL from `EXPO_PUBLIC_API_URL` to talk to your laptop.

**Firewall:** If the phone can’t reach the backend, allow inbound TCP port 8000 on your laptop (e.g. macOS: System Settings → Network → Firewall).

---

## QR code scanned but nothing happens in Expo Go

If you scan the QR code and Expo Go stays on a blank screen, shows “Unable to connect”, or never loads the app, the phone usually **can’t reach the Metro dev server** on your laptop.

### Try these in order

**1. Use tunnel mode (works even on different Wi‑Fi)**  
On the laptop, in `nutrition_frontend`:

```bash
npx expo start --tunnel
```

Wait until it prints a URL like `https://xxx.ngrok-free.app`. Then in Expo Go, scan the **new** QR code (or enter the URL). The app loads over the internet, so the phone and laptop don’t need to be on the same network.  
First run may ask to install `@expo/ngrok`; say yes.

**2. Same Wi‑Fi**  
If you’re not using tunnel, the phone and laptop must be on the **same Wi‑Fi**. The default QR code uses your laptop’s LAN IP (e.g. `exp://192.168.1.5:8081`). If the phone is on mobile data or another network, it can’t connect.

**3. Allow Metro port (8081) in the firewall**  
- **Windows:** Allow inbound TCP port **8081** (same way you did for 8000), or allow “Node.js” / the terminal app you use for `npx expo start`.  
- **Mac:** System Settings → Network → Firewall → allow your terminal/Node.

**4. Type the URL manually in Expo Go**  
In Expo Go, use “Enter URL manually” and type the URL shown in the terminal after `npx expo start` (e.g. `exp://192.168.1.5:8081`). Use your laptop’s real IP.

**5. Restart and try again**  
- Stop Expo (Ctrl+C), run `npx expo start` (or `npx expo start --tunnel`) again.  
- In Expo Go, close the project if it’s stuck, then scan the QR code again.

Using **`npx expo start --tunnel`** is the most reliable when “scan QR and nothing happens”.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

