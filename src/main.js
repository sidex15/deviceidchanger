import "7.css/dist/7.scoped.css"
import './style.css'
import { exec, toast } from 'kernelsu';

// Function to parse XML settings to JavaScript object
function parseSettingsXmlToObject(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const settings = {};
  const settingElements = xmlDoc.querySelectorAll('setting');
  
  settingElements.forEach(setting => {
    const value = setting.getAttribute('value');
    const packageName = setting.getAttribute('package');
    
    settings[packageName] = {
      ssaid: value,
      packageName: packageName,
      defaultValue: setting.getAttribute('defaultValue'),
      defaultSysSet: setting.getAttribute('defaultSysSet') === 'true',
      tag: setting.getAttribute('tag')
    };
  });
  
  return settings;
}

//run function
async function run(cmd) {
	const { errno, stdout, stderr } = await exec(cmd);
	if (errno != 0) {
		toast(`stderr: ${stderr}`);
		return undefined;
	} else {
		return stdout;
	}
}

// Function to generate a random hexadecimal string of specified length
function hexrand(length) {
    let result = '';
    const characters = 'abcdef0123456789';
    
    // Loop to generate characters for the specified length
    for (let i = 0; i < length; i++) {
        const randomInd = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomInd);
    }
    return result;
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

// Persisted target user id (default "0")
function targetUid() {
	return localStorage.getItem('ssa_uid') || '0';
}
function setTargetUid(u) {
	localStorage.setItem('ssa_uid', String(u));
}

// Discover user IDs (e.g. 0,10,11)
async function listUsers() {
  const out = await run('cmd user list');
  return [...out.matchAll(/UserInfo\{(\d+):/g)].map(m=>m[1]).sort();
}


// Set a random background image from the specified range
const bg_body = document.querySelector('body');
const bg_images = [
  '/wallpapers/frutiger-aero-wallpapers-1.jpg',
  '/wallpapers/frutiger-aero-wallpapers-2.jpg',
  '/wallpapers/frutiger-aero-wallpapers-3.jpg',
  '/wallpapers/frutiger-aero-wallpapers-4.jpg',
  '/wallpapers/frutiger-aero-wallpapers-5.jpg',
];

// Select one random image
const selectedImage = bg_images[getRandomArbitrary(0, bg_images.length)];
console.log(`Background image set to: ${selectedImage}`);
bg_body.style.backgroundImage = `url('${selectedImage}')`;
bg_body.style.backgroundRepeat = 'no-repeat';
bg_body.style.backgroundAttachment = 'fixed';
bg_body.style.backgroundSize = 'cover';
bg_body.style.backgroundPosition = 'center';

// Path to the settings_ssaid.xml file
const moddir = '/data/adb/modules/deviceidchanger';
const backup_ssaidlocation = `/sdcard/settings_ssaid.xml`;
const arch = await run(`uname -m`);

// Function to load settings for a specific UID
async function loadSettingsForUid(uid) {
  const currentSsaidLocation = `/data/system/users/${uid}/settings_ssaid.xml`;
  const currentAbxSsaidLocation = `${moddir}/tmp/settings_ssaid.u${uid}.xml`;
  
  // Check if the file is ABX or not
  const ssaidfilecheck = await run(`file ${currentSsaidLocation}`);
  console.log(`SSAID file check result for UID ${uid}: ${ssaidfilecheck}`);
  const isnotABX = ssaidfilecheck.includes(`ASCII text`) ? true : false;
  console.log(`Is SSAID file ABX for UID ${uid}: ${isnotABX}`);

  // Your XML data as a string
  const xmlData = isnotABX ? await run(`cat ${currentSsaidLocation}`) : await run(`abx2xml ${currentSsaidLocation} ${currentAbxSsaidLocation}; cat ${currentAbxSsaidLocation}`);
  console.log(`XML data loaded from: ${isnotABX ? currentSsaidLocation : currentAbxSsaidLocation}`);

  // Parse the XML and convert to JavaScript object
  const settingsObject = parseSettingsXmlToObject(xmlData.toString());
  console.log('Parsed settings for UID', uid, ':', settingsObject);
  
  return { settingsObject, isnotABX, currentSsaidLocation, currentAbxSsaidLocation };
}

// Load initial settings
let { settingsObject, isnotABX, currentSsaidLocation, currentAbxSsaidLocation } = await loadSettingsForUid(targetUid());
let ssaidlocation = currentSsaidLocation;
let abx_ssaidlocation = currentAbxSsaidLocation;

var isssaidChangeSuccess = false;

// Function to populate the app package dropdown
function populateAppDropdown(select, settingsObj) {
  // Clear existing options except the first default option
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }
  
  for (const [packageName, { ssaid }] of Object.entries(settingsObj)) {
    if (packageName === 'android') {
      continue; // Skip the 'android' package as it is not an app
    }
    const option = document.createElement('option');
    option.value = ssaid;
    option.textContent = packageName; // Display package name in the dropdown
    select.appendChild(option);
  }
}

// Function to update settings when UID changes
async function updateSettingsForUid(uid, select, ssaidValueInput, currentPackageNameRef) {
  try {
    const result = await loadSettingsForUid(uid);
    
    // Update global variables
    settingsObject = result.settingsObject;
    isnotABX = result.isnotABX;
    ssaidlocation = result.currentSsaidLocation;
    abx_ssaidlocation = result.currentAbxSsaidLocation;
    
    // Update the dropdown menu
    populateAppDropdown(select, settingsObject);
    
    // Clear the SSAID value input and reset current package name
    ssaidValueInput.value = '';
    currentPackageNameRef.value = '';
    
    console.log(`Successfully updated settings for UID: ${uid}`);
  } catch (error) {
    console.error(`Error updating settings for UID ${uid}:`, error);
    toast(`Error loading settings for UID ${uid}: ${error.message}`);
  }
}

async function mainSSAIDChange() {
  const uidSel = document.getElementById('uid-select');
  const select = document.getElementById('app-pkg');
  var ssaid_value = document.getElementById('ssaid-value');
  const balloon = document.getElementById('balloon-text');
  const randomize_ssaid = document.getElementById('randomize-ssaid');
  const apply_ssaid = document.getElementById('apply-ssaid');
  const default_ssaid = document.getElementById('default-ssaid');
  const about_window = document.getElementById('about-window');
  const open_about = document.getElementById('open-about');
  const close_about = document.getElementById('close-about');
  const dialog_div = document.getElementById('dialog-div');
  const dialog_msg = document.getElementById('dialog-msg');
  const dialog_close1 = document.getElementById('dialog-close1');
  const dialog_close2 = document.getElementById('dialog-close2');
  const backup_settings = document.getElementById('backup-settings');
  const donate_window = document.getElementById('donate-window');
  const open_donate = document.getElementById('open-donate');
  const close_donate = document.getElementById('close-donate');
  var currentPackageNameRef = { value: '' }; // Use object to allow reference passing
  
  const uids = await listUsers();
  uids.forEach(uid => {
    const option = document.createElement('option');
    option.value = option.textContent = uid;
    if (uid === targetUid()) option.selected = true;
    uidSel.appendChild(option);
  });
  
  // Update UID change event listener to avoid location.reload()
  uidSel.addEventListener('change', async (e) => { 
    setTargetUid(e.target.value); 
    await updateSettingsForUid(e.target.value, select, ssaid_value, currentPackageNameRef);
  });

  // Initial population of the app dropdown
  populateAppDropdown(select, settingsObject);

  select.addEventListener('click', (event) => {
    event.preventDefault();
  });

  select.addEventListener('change', (event) => {
    var selectedPackage = event.target.value;
    var selectedPackageName = event.target.options[event.target.selectedIndex].textContent;
    console.log(selectedPackageName, ': ', selectedPackage);
    ssaid_value.value = selectedPackage;
    currentPackageNameRef.value = selectedPackageName;
  });

  randomize_ssaid.addEventListener('click', () => {
    ssaid_value.value = hexrand(16);
  });

  default_ssaid.addEventListener('click', () => {
    if (currentPackageNameRef.value && settingsObject[currentPackageNameRef.value]) {
      ssaid_value.value = settingsObject[currentPackageNameRef.value].defaultValue;
    }
  });

  apply_ssaid.addEventListener('click', async () => {
    var selectedPackage = ssaid_value.value;
    var selectedPackageName = select.options[select.selectedIndex].textContent;
    if (Boolean(selectedPackage.match(/^[0-9a-f]+$/i)) && selectedPackage.length == 16) {
      console.log(`Applying SSAID: ${selectedPackage} for package: ${selectedPackageName}`);
      if (isnotABX) {
        await run(`sed -i 's/value=\"${settingsObject[selectedPackageName].ssaid}\"/value=\"${selectedPackage}\"/' ${ssaidlocation}`);
      }
      else {
        await run(`sed -i 's/value="${settingsObject[selectedPackageName].ssaid}"/value="${selectedPackage}"/' ${abx_ssaidlocation}`);
        await run(`xml2abx ${abx_ssaidlocation} ${ssaidlocation}`);
      }
      await run(`chmod 600 ${ssaidlocation}`);
      settingsObject[selectedPackageName].ssaid = selectedPackage;
      dialog_msg.innerHTML = `SSAID for <b>${selectedPackageName}</b> changed to <b>${selectedPackage}</b>`;
      dialog_close2.innerHTML = 'Reboot';
      isssaidChangeSuccess = true;
      dialog_div.hidden = false;
    }
    else{
      balloon.hidden = false;
      setTimeout(() => {
        balloon.hidden = true;
      }, 5000);
    }
  });

  backup_settings.addEventListener('click', async () => {
    await run(`cp ${ssaidlocation} ${backup_ssaidlocation}`);
    dialog_msg.innerHTML = `Backup created at <b>${backup_ssaidlocation}</b>`;
    dialog_close2.innerHTML = 'Close';
    isssaidChangeSuccess = false;
    dialog_div.hidden = false;
  });

  open_about.addEventListener('click', () => {
    about_window.hidden = false;
  });

  close_about.addEventListener('click', () => {
    setTimeout(() => {
      about_window.hidden = true;
    }, 100);
  });

  dialog_close1.addEventListener('click', () => {
    setTimeout(() => {
      dialog_div.hidden = true;
    }, 100);
  });

  dialog_close2.addEventListener('click', () => {
    setTimeout(async () => {
      if (isssaidChangeSuccess) {
        await run(`reboot`);
      }
      dialog_div.hidden = true;
    }, 100);
  });

  open_donate.addEventListener('click', () => {
    donate_window.hidden = false;
  });

  close_donate.addEventListener('click', () => {
    setTimeout(() => {
      donate_window.hidden = true;
    }, 100);
  });

  close_donate.addEventListener('click', () => {
    setTimeout(() => {
      donate_window.hidden = true;
    }, 100);
  });
}

mainSSAIDChange();