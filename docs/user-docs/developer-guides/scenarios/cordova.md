# Using Aurelia 2 with Cordova/PhoneGap

This guide will demonstrate how to integrate Aurelia 2 with Cordova/PhoneGap for mobile application development.

## Prerequisites

Ensure you have the following installed:

- Node.js and npm
- Cordova CLI: `npm install -g cordova`

## Step 1: Create a Cordova Project

Start by creating a new Cordova project:

```bash
cordova create aurelia-cordova com.example.aureliacordova AureliaCordova
cd aurelia-cordova
```

## Step 2: Add Your Target Platform

Add the platforms you are targeting:

```bash
cordova platform add android
cordova platform add ios # Only for macOS
```

## Step 3: Create an Aurelia 2 Project

Navigate to the `www` directory, which Cordova uses for the web application content. You'll want to clear its contents, as we will generate the Aurelia 2 app directly in this directory.

```bash
cd www
rm -rf *
```

Now, use `npx makes aurelia` with the `--here` flag to create a new Aurelia 2 project in the current directory without creating an additional folder:

```bash
npx makes aurelia --here
```

## Step 4: Configure the Aurelia 2 Project

Configure your Aurelia 2 build process to output the files directly into the `www` directory. If you are using the default setup with Webpack, you may not need to change anything, as it already outputs to a `dist` folder inside the current directory. However, review your configuration to ensure it aligns with Cordova's structure.

## Step 5: Build the Aurelia 2 Application

Build your Aurelia 2 application. The build process should place the output into the `www` directory.

```bash
# Follow the build steps for your specific Aurelia 2 setup
npm run build
```

## Step 6: Build and Run the Cordova Application

After building your Aurelia application, navigate back to the root directory of your Cordova project. You can now build the Cordova app:

```bash
cd ..
cordova build
```

Run your application on an emulator or a connected device with the following command:

```bash
cordova emulate android
# or
cordova run android
```

## Conclusion

You now have an Aurelia 2 application packaged within a Cordova application, ready for mobile deployment. Be sure to utilize Cordova plugins to access native device features and thoroughly test on different devices for performance and user experience.

## Additional Tips and Best Practices

### Using Cordova Plugins

To access native device functionalities (GPS, camera, file system, etc.), install the appropriate Cordova plugins. For example, to use the Cordova device plugin:

```bash
cordova plugin add cordova-plugin-device
```

Within your Aurelia application, you can create a service to interact with the plugin. For instance:

```js
// src/services/device-service.js
export class DeviceService {
  getDeviceInfo() {
    if (window.device) {
      return {
        model: window.device.model,
        platform: window.device.platform,
        version: window.device.version,
      };
    }
    return null;
  }
}
```

Then inject and consume this service in your components as needed.

### Debugging and Live Reload

While Cordova doesn't provide live reload by default, you can improve your development workflow by running Aurelia's development server (e.g., `npm run start`) and pointing your Cordova `www` folder to the build output or working with the local dev server. You can then:

1. Make changes in your Aurelia application.
2. Refresh the Cordova environment (or use a live reload plugin) to pick up changes quickly.
3. Use your browser or remote debugging tools (like Chrome DevTools or Safari Web Inspector) to debug the Cordova application when running on an emulator or device.
