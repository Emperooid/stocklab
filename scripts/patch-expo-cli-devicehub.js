#!/usr/bin/env node
/**
 * Xcode 26+ renamed Simulator.app to DeviceHub.app (bundle id
 * com.apple.dt.Devices, process name "DeviceHub"). The @expo/cli bundled
 * inside our pinned `expo` version predates that rename and hardcodes the
 * old name/bundle id in three places, causing:
 *   CommandError: Can't determine id of Simulator app; the Simulator is
 *   most likely not installed on this machine.
 * This patches those spots in place. It's idempotent (safe to run
 * every `npm install` via the postinstall hook) and a no-op once @expo/cli
 * ships native DeviceHub support upstream.
 */
const fs = require('fs');
const path = require('path');

const cliDir = path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', '@expo', 'cli', 'build', 'src', 'start');

function patch(file, replacements) {
  const fullPath = path.join(cliDir, file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[patch-expo-cli-devicehub] skip (not found): ${file}`);
    return;
  }
  let src = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  for (const { marker, from, to } of replacements) {
    if (src.includes(marker)) {
      continue; // already patched
    }
    if (!src.includes(from)) {
      console.warn(`[patch-expo-cli-devicehub] pattern not found (upstream may have changed) in ${file}`);
      continue;
    }
    src = src.replace(from, to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(fullPath, src);
    console.log(`[patch-expo-cli-devicehub] patched ${file}`);
  }
}

patch(path.join('doctor', 'apple', 'SimulatorAppPrerequisite.js'), [
  {
    marker: "result !== 'com.apple.dt.Devices'",
    from: "result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {",
    to: "result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline' && result !== 'com.apple.dt.Devices') {",
  },
  {
    marker: 'DeviceHub.app',
    from: `const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', 'Simulator.app', 'Contents', 'Info.plist');
        const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [
            'read',
            simulatorInfoPlist,
            'CFBundleIdentifier'
        ]);
        return bundleId.trim() || null;
    } catch  {
    // Simulator.app not found at the expected path or xcode-select is unavailable.
    }
    return null;
}`,
    to: `const dir = developerDir.trim();
        const candidatePlists = [
            _path().default.join(dir, 'Applications', 'Simulator.app', 'Contents', 'Info.plist'),
            _path().default.join(dir, '..', 'Applications', 'DeviceHub.app', 'Contents', 'Info.plist'),
            _path().default.join(dir, 'Applications', 'DeviceHub.app', 'Contents', 'Info.plist')
        ];
        for (const plist of candidatePlists){
            try {
                const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [
                    'read',
                    plist,
                    'CFBundleIdentifier'
                ]);
                if (bundleId.trim()) return bundleId.trim();
            } catch  {
            // try next candidate
            }
        }
    } catch  {
    // xcode-select is unavailable.
    }
    return null;
}`,
  },
]);

patch(path.join('platforms', 'ios', 'ensureSimulatorAppRunning.js'), [
  {
    marker: 'name is "DeviceHub"',
    from: 'tell app "System Events" to count processes whose name is "Simulator"',
    to: 'tell app "System Events" to count processes whose name is "Simulator" or name is "DeviceHub"',
  },
  {
    marker: "'DeviceHub'\n    ];",
    from: `const args = [
        '-a',
        'Simulator'
    ];
    if (device.udid) {
        // This has no effect if the app is already running.
        args.push('--args', '-CurrentDeviceUDID', device.udid);
    }
    await (0, _spawnasync().default)('open', args);
}`,
    to: `const args = [
        '-a',
        'DeviceHub'
    ];
    if (device.udid) {
        // This has no effect if the app is already running.
        args.push('--args', '-CurrentDeviceUDID', device.udid);
    }
    try {
        await (0, _spawnasync().default)('open', args);
    } catch  {
        await (0, _spawnasync().default)('open', [
            '-a',
            'Simulator',
            ...args.slice(2)
        ]);
    }
}`,
  },
]);

patch(path.join('platforms', 'ios', 'AppleDeviceManager.js'), [
  {
    marker: 'tell application "DeviceHub" to activate',
    from: '        // TODO: Focus the individual window\n        await _osascript().execAsync(`tell application "Simulator" to activate`);',
    to: `        // TODO: Focus the individual window
        try {
            await _osascript().execAsync(\`tell application "DeviceHub" to activate\`);
        } catch  {
            await _osascript().execAsync(\`tell application "Simulator" to activate\`);
        }`,
  },
]);
