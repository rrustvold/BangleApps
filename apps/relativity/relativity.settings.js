(function(back) {
  const SETTINGS_FILE = "relativity.json";
  
  // Load current settings
  let settings = Object.assign({
    speedOfLight: 30  // default speed of light in mph
  }, require('Storage').readJSON(SETTINGS_FILE, true) || {});

  function save() {
    require('Storage').writeJSON(SETTINGS_FILE, settings);
  }

  E.showMenu({
    '': { 'title': 'Relativity Settings' },
    '< Back': back,
    'Speed of Light': {
      value: settings.speedOfLight,
      min: 1, max: 1000, step: 1,
      onchange: v => {
        settings.speedOfLight = v;
        save();
      }
    },
    'Reset to Defaults': () => {
      E.showPrompt('Reset to defaults?').then((confirmed) => {
        if (confirmed) {
          settings = { speedOfLight: 30 };
          save();
          E.showMenu(); // refresh menu
        }
      });
    }
  });
});