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

// Path to the settings_ssaid.xml file
const ssaidlocation = '/data/system/users/0/settings_ssaid.xml';
const backup_ssaidlocation = '/data/adb/modules/deviceidchanger/settings_ssaid.xml';

// Your XML data as a string
const xmlData = await run(`cat ${ssaidlocation}`);

// Parse the XML and convert to JavaScript object
const settingsObject = parseSettingsXmlToObject(xmlData.toString());
console.log('Parsed settings:', settingsObject);

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

var isssaidChangeSuccess = false;

async function mainSSAIDChange() {
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
  var current_packagename = '';

  for (const [packageName, { ssaid }] of Object.entries(settingsObject)) {
    const option = document.createElement('option');
    option.value = ssaid;
    option.textContent = packageName; // Display package name in the dropdown
    if (packageName === 'android') {
      continue; // Skip the 'android' package as it is not an app
    }
    select.appendChild(option);
  }

  select.addEventListener('click', (event) => {
    event.preventDefault();
  });

  select.addEventListener('change', (event) => {
    var selectedPackage = event.target.value;
    var selectedPackageName = event.target.options[event.target.selectedIndex].textContent;
    console.log(selectedPackageName, ': ', selectedPackage);
    ssaid_value.value = selectedPackage;
    current_packagename = selectedPackageName;
  });

  randomize_ssaid.addEventListener('click', () => {
    ssaid_value.value = hexrand(16);
  });

  default_ssaid.addEventListener('click', () => {
    ssaid_value.value = settingsObject[current_packagename].defaultValue;
  });

  apply_ssaid.addEventListener('click', async () => {
    var selectedPackage = ssaid_value.value;
    var selectedPackageName = select.options[select.selectedIndex].textContent;
    if (Boolean(selectedPackage.match(/^[0-9a-f]+$/i)) && selectedPackage.length == 16) {
      console.log(`Applying SSAID: ${selectedPackage} for package: ${selectedPackageName}`);
      await run(`sed -i 's/value=\"${settingsObject[selectedPackageName].ssaid}\"/value=\"${selectedPackage}\"/' ${ssaidlocation}`);
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