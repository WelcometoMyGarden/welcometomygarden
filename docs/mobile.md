## Connecting to a local development server

`android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config>
    <trust-anchors>
      <!-- Trust user added CAs -->
      <certificates src="@raw/<the .pem filename added to this folder without extension>"/>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
```
