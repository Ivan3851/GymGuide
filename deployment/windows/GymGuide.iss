#ifndef PayloadDir
  #error Define PayloadDir as the inspected output from Build-OfflinePayload.ps1.
#endif
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif

[Setup]
AppId={{A75E5CF4-87DD-44A4-9E17-85DD25FD1EA7}
AppName=GymGuide
AppVersion={#AppVersion}
AppPublisher=GymGuide
DefaultDirName={autopf}\GymGuide
DefaultGroupName=GymGuide
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
OutputDir=output
OutputBaseFilename=GymGuide-{#AppVersion}-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
Uninstallable=yes

[Tasks]
Name: "registerservice"; Description: "Register and start the GymGuide Windows service (requires MongoDB to be installed and running)"; Flags: unchecked

[Dirs]
Name: "{app}\releases\{#AppVersion}\app"; Permissions: users-readexec
Name: "{app}\releases\{#AppVersion}\runtime"; Permissions: users-readexec
Name: "{app}\tools"; Permissions: users-readexec
Name: "{commonappdata}\GymGuide\config"
Name: "{commonappdata}\GymGuide\media"
Name: "{commonappdata}\GymGuide\logs"
Name: "{commonappdata}\GymGuide\backups"

[Files]
Source: "{#PayloadDir}\app\*"; DestDir: "{app}\releases\{#AppVersion}\app"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\runtime\*"; DestDir: "{app}\releases\{#AppVersion}\runtime"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\GymGuideService.exe"; DestDir: "{app}"; Flags: onlyifdoesntexist
Source: "{#PayloadDir}\GymGuideService.xml"; DestDir: "{app}"; Flags: onlyifdoesntexist
Source: "{#PayloadDir}\gymguide.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PayloadDir}\tools\*"; DestDir: "{app}\tools"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#PayloadDir}\gymguide.env.example"; DestDir: "{commonappdata}\GymGuide\config"; DestName: "gymguide.env.example"; Flags: onlyifdoesntexist

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\tools\Initialize-GymGuideData.ps1"" -DataRoot ""{commonappdata}\GymGuide"""; StatusMsg: "Preparing GymGuide's local data folders..."; Flags: waituntilterminated
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\tools\Install-GymGuideService.ps1"" -InstallRoot ""{app}"" -DataRoot ""{commonappdata}\GymGuide"" -ReleaseVersion ""{#AppVersion}"""; Tasks: registerservice; Description: "Install the GymGuide local service"; Flags: postinstall waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\tools\Remove-GymGuideService.ps1"" -InstallRoot ""{app}"" -Confirm:$false"; Flags: runascurrentuser waituntilterminated skipifdoesntexist

[UninstallDelete]
; Deliberately no deletion entries for ProgramData, database files, media, settings, logs, or backups.
