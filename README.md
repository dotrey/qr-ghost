# qr-ghost
A simple and lightweight QR code scanner.

## open ideas
- Add support for WiFi QR codes
- Fix layout for tablets where less height is available
- Wrap as Android app -> see github.com/dotrey/qr-ghost-android

## dev log
**2020-02-22** v0.9
- Added features requires for PWA
  - ServiceWorker for offline mode
  - .webmanifest for device installation

**2020-01-12** v0.8
- Added manual camera selection if there is more than 1 backward facing camera

**2020-01-04** v0.7
- Reduced number of permission request by keeping video input stream
- Automated release of video stream after loosing focus

**2019-12-31** v0.6
- Added exhaustive scan mode (slower) for improved QR code detection
- Fixed auto-select on multi-cam devices
- Changed icon for scan button to camera icon for better recognition of the functionality

**2019-12-30** v0.4 / v0.5
- Added support for back-button (v0.5)
- Added mechanism to automatically select default camera on devices with multiple cameras (v0.4)

**2019-12-29** v0.3
- Added `?debug` parameter to show console output

**2019-12-27** v0.3
- Display info when in landscape mode that portrait is required

**2019-12-25** v0.3
- Improved video overlay
- Added button to copy QR content
- Added logo
- Added examples of supported and unsupported code types

**2019-12-24** v0.2
- Connected live video to decoder
- Added info view and credits

**2019-12-23** v0.2
- Tap into device camera and display live video

**2019-12-21** v0.1
Initial commit
- Read QR code from sample image using jsQR
- Display QR content, with optional link formatting if a link is recognized
