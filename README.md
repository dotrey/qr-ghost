# qr-ghost
A simple and lightweight QR code scanner.

## open ideas
- Add exhaustive scan mode (slower)
- Add support for WiFi QR codes
- Add buttons to manually select camera (automatic detection requires permission, which might cause unwanted permission requests in browsers like Opera)
- New project: Wrap as Android app

## dev log
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
