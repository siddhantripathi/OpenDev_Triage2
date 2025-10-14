# Allow n8n Through Windows Firewall

If your mobile device can't access n8n at `http://10.0.0.87:5678`, you need to allow it through Windows Firewall.

## Option 1: PowerShell Command (Quick)

Run PowerShell as Administrator and execute:

```powershell
New-NetFirewallRule -DisplayName "n8n Development Server" -Direction Inbound -LocalPort 5678 -Protocol TCP -Action Allow
```

## Option 2: Windows Firewall GUI

1. Open "Windows Defender Firewall with Advanced Security"
2. Click "Inbound Rules" in left panel
3. Click "New Rule..." in right panel
4. Select "Port" → Next
5. Select "TCP" and enter "5678" → Next
6. Select "Allow the connection" → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it "n8n Development Server" → Finish

## Test It Works

1. On your computer browser: `http://localhost:5678` ✓
2. On your mobile device browser (same WiFi): `http://10.0.0.87:5678` ✓

If both work, you're ready to test the app!

