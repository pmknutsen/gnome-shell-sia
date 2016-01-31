/*
Sia Cloud Storage Gnome Shell Extension
https://github.com/pmknutsen/gnome-shell-sia
*/

const St          = imports.gi.St;   // https://developer.gnome.org/st/stable/
const GLib        = imports.gi.GLib; // https://developer.gnome.org/glib/stable/
const Gio         = imports.gi.Gio;  // https://developer.gnome.org/gio/stable/
const Lang        = imports.lang;
const Tweener     = imports.ui.tweener;
const Util        = imports.misc.util;
const Soup        = imports.gi.Soup;
const Main        = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu   = imports.ui.panelMenu;
const PopupMenu   = imports.ui.popupMenu;
const Panel       = imports.ui.panel;

const GETTEXT_DOMAIN = 'gnome-shell-extension-sia';
const Gettext        = imports.gettext.domain(GETTEXT_DOMAIN);
const _              = Gettext.gettext;

/* Import local .js dependencies */
const ExtensionUtils = imports.misc.extensionUtils;
const Extension      = ExtensionUtils.getCurrentExtension();
const Convenience    = Extension.imports.lib.convenience;
const BigNumber      = Extension.imports.lib.bignumber;
const _pdiag         = Extension.imports.passworddialog;
const _sendDialog    = Extension.imports.senddialog;

/* Clipboard stuff */
const Clipboard      = St.Clipboard.get_default();
const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

/* Global variables */
let siaMonitor;

const HOMEDIR            = GLib.get_home_dir();
const SIADIR             = 'Sia';
const SYNCFOLDERNAME     = 'Desktop';     // name used for folder in Sia renter (and UI)
const TIMER_INTERVAL     = 30;            // update interval, sec
const FILE_SYNC_LIMIT    = 5;             // max # files to sync each cycle
const SYNC_RECURSION_LIM = 20;            // Sync recursion limit, folders
const MAX_FILES_QUEUED   = 5;             // max # files in renter queue (limits sync intensity)
const REDUNDANCY         = 6;             // redundancy factor (should match what is hardcoded in siad)
const DEFAULTDURATION    = 2000;          // default upload duration (blocks)
const RENEWFILES         = false;         // renew uploaded files
const ENABLELOGGING      = false;         // log messages printed to log()

let g_syncPause          = false;
let walletUnlocked       = false;
let g_currentBlock       = 0;
let g_fileEmblems        = [];
let g_versionOk          = true;

/* Start sync timer */
let timeoutID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, TIMER_INTERVAL, timerExec);

/* Start Soup session (used by getJSON) */
const HTTP_TOO_MANY_REQUESTS = 429;
const _httpSession = new Soup.SessionAsync();
_httpSession['user-agent'] = 'Sia-Agent';
Soup.Session.prototype.add_feature.call(
  _httpSession,
  new Soup.ProxyResolverDefault()
);

/**
 * Define new entry in the gnome3 status-area.
 * @type {Lang.Class}
 */
const Sia = new Lang.Class({
  Name : 'Sia',
  Extends : PanelMenu.Button,

  _walletstatus :    null,
  _walletbalance :   null,
  _walletpending :   null,
  _walletsend :      null,
  _walletreceive :   null,
  _pausesync :       null,
  _siaIcon :         null,
  _filesSynced :     null,
  _filesRedundancy : null,
  _gbUsed :          null,

  _init : function() {
    this.parent(0.0, "Sia");

    /* Display icon */
    this._siaIcon = new St.Icon({ icon_name: 'sia-icon', style_class: 'sia-icon' });
    this.actor.add_child(this._siaIcon);

    /* Create menu */
    this._createMenu();
    getWalletLockStatus();

    /* Create the ~/Sia directory */
    createSiaDir();

    /* Auto-start siad if not already running */
    this._startSiad();
  },

  _startSiad : function() {
    getJSON('GET', '/consensus', null, function(code, json) {
      let result = JSON.parse(json);
      if (result === undefined || result === null) {
        /* Start siad */
        let path = GLib.find_program_in_path('siad');
        if (path === null) {
          showNotification('Sia not found on this system. Start siad manually, or add siad to your path.');
        } else {
          /* Run autostart.sh to start siad */
          let shpath = HOMEDIR + '/.local/share/gnome-shell/extensions/sia@pmknutsen.github.com/autostart.sh';
          Util.spawn(['chmod', '+x', shpath]);
          Util.spawn([shpath]);
          showNotification('Starting Sia daemon...');
       }
      }
    });
  },

  _createMenu : function() {
    this._walletstatus  = this._newPopupMenuItem(this, 'Sia is not running', 'emblem-readonly', 'menu-item', this._getWalletPass);
    this._walletbalance = this._newPopupMenuItem(this, 'Balance: 0 SC', null, 'menu-subitem', this._updateBalance);
    this._walletpending = this._newPopupMenuItem(this, 'Pending: 0 SC', null, 'menu-subitem', this._updateBalance);
    this._walletsend    = this._newPopupMenuItem(this, 'Send Funds...', null, 'menu-subitem', this._sendSiacoins);
    this._walletreceive = this._newPopupMenuItem(this, 'Receive Funds...', null, 'menu-subitem', this._receiveSiacoins);

    this._newPopupSeparator(this, this._updateBalance);

    this._newPopupMenuItem(this, 'Open Sia Folder', 'folder-open', 'menu-item', this._openSyncFolder);
    this._filesSynced      = this._newPopupMenuItem(this, '', null, 'menu-subitem2', syncSiaFolder);
    this._filesRedundancy  = this._newPopupMenuItem(this, '', null, 'menu-subitem2', syncSiaFolder);

    this._gbUsed       = this._newPopupMenuItem(this, '', null, 'menu-subitem2', syncSiaFolder);
    this._pausesync    = this._newPopupMenuItem(this, 'Pause Syncing', null, 'menu-subitem', pauseSync);
  },

  _newPopupMenuItem : function(parent, title, iconname, style, method) {
    let item = new IconMenuItem(title, iconname, style);
    item.connect('activate', Lang.bind(this, method));
    parent.menu.addMenuItem(item);
    return item;
  },

  _newPopupSeparator : function(parent, method) {
    let item = new PopupMenu.PopupSeparatorMenuItem();
    item.connect('activate', Lang.bind(this, method));
    parent.menu.addMenuItem(item);
  },

  /* Display wallet authentication dialog */
  _getWalletPass : function() {
    getJSON('GET', '/wallet', null, function(code, json) {
      let wallet = JSON.parse(json);
      if (wallet !== null) {
        if (wallet.unlocked) {
          lockWallet();
        } else {
          let pdiag = new _pdiag.PasswordDialog;
          pdiag.set_callback(unlockWallet);
          pdiag.open(global.get_current_time());
        }
      }
    });
  },

  /* Send Siacoins */
  _sendSiacoins : function() {
    let sendDialog = new _sendDialog.InputDialog;
    sendDialog.set_callback(sendSiacoins);
    sendDialog.open(global.get_current_time());
  },

  /* Receive Siacoins (copy address to clipboard) */
  _receiveSiacoins : function() {
    /* Get new address */
    getJSON('GET', '/wallet/address', null, function(code, json) {
      let result = JSON.parse(json);
      Clipboard.set_text(CLIPBOARD_TYPE, result.address);
      showNotification('Siacoin address copied to clipboard.');
    });
  },

  /* Open synchronization folder */
  _openSyncFolder : function() {
    Util.spawn(['nautilus', SIADIR]);
  },

  /* Update wallet balance */
  _updateBalance : function() {
    getJSON('GET', '/wallet', null, updateWalletBalance);
  },
});

/* Start plugin */
function init(metadata) {
  Convenience.initTranslations(GETTEXT_DOMAIN);
}

/* Called when the extension is activated (maybe multiple times) */
function enable() {
  siaMonitor = new Sia();
  Main.panel.addToStatusArea('sia', siaMonitor);
  showWalletUnlockedItems(walletUnlocked);
  updateBlockCounter();
  updateRenterMenu();
}

/* Called when the extension is deactivated (maybe multiple times) */
function disable() {
  siaMonitor.destroy();
}

/* Log to log() */
function logMsg(msg) {
  if (ENABLELOGGING)
    log('Sia: ' + msg);
  return;
}

/* Pause synchronization */
function pauseSync() {
  g_syncPause = !g_syncPause;
  if (g_syncPause) {
    siaMonitor._pausesync.label.text = 'Resume Syncing';
  } else {
    siaMonitor._pausesync.label.text = 'Pause Syncing';
    showNotification('Synchronization resumed.');
  }
  return true;
}

/* Create the ~/Sia sync folder */
function createSiaDir() {
  Util.spawn(['mkdir', '-p', SIADIR]);
  Util.spawn(['gvfs-set-attribute', SIADIR, '-t', 'string', 'metadata::custom-icon', getIconPath()]);
}

/* Get path to Sia icon */
function getIconPath() {
  let icon = 'file://' + HOMEDIR + '/.local/share/gnome-shell/extensions/sia@pmknutsen.github.com/img/icon.png';
  return icon;  
}

/* Send Siacoins */
function sendSiacoins(address, siacoins) {
  /* Validate address */
  if (address === null) return;
  if (!isAddress(address)) {
    showNotification('Invalid address.');
    return;
  }

  /* Validate address */
  if (siacoins <= 0) {
    showNotification('Invalid amount.');
    return;
  }

  /* Convert Siacoins to hastings */
  let hastings = convertHastings(siacoins);

  /* Send Siacoins */
  getJSON('POST', '/wallet/siacoins', 'amount=' + siacoins + '&destination=' + address, function(code, json) {
    let result = JSON.parse(json);
    if (result === null) {
        showNotification('Failed to send. Wallet not responding.');
    } else {
      if ('transactionids' in result) {
        /* Copy transaction ID to clipboard */
        Clipboard.set_text(CLIPBOARD_TYPE, result.transactionids[0]);
        showNotification('Sent ' + siacoins + ' SC. Transaction ID copied to clipboard.');
      } else {
        showNotification('Failed to send funds!');
      }
    }
  });
}

/* Convert Siacoins to hastings */
function convertSiacoin(hastings) {
  var number = new BigNumber.BigNumber(hastings);
  var ConversionFactor = new BigNumber.BigNumber(10).pow(24);
  return number.dividedBy(ConversionFactor).round(2);
}

/* Convert Siacoins to hastings */
function convertHastings(siacoins) {
  var number = new BigNumber.BigNumber(siacoins);
  var ConversionFactor = new BigNumber.BigNumber(10).pow(24);
  return number.times(ConversionFactor).toFixed(0);
}

/* Address has to be lowercase hex and 76 chars */
function isAddress(str) {
  if (str === null) return false;
  return str.match(/^[a-f0-9]{76}$/) !== null;
}

/* Synchronization local folder with Sia renter

  The file upload logic is for now very simple:
    If a local file is not in the renter, then add it.
    If a local file is in the renter, then add it if:
          filesizes don't match
      or  file in renter has expired

  Hidden files (w/dot prefix) are ignored.
*/

let syncLevel = 0;

/* Synchronize the Sia folder */
function syncSiaFolder() {
  /* Do not sync if wallet is locked */
  if (!walletUnlocked) return;

  /* Get list of files in renter */
  getJSON('GET', '/renter/files', null, function(code, json) {
    let renter = JSON.parse(json);
    if (renter === null) return;
    renter = renter.files;

    /* Abort sync if there are too many unavailable files in renter queue */
    if (getIncompleteFiles(renter) >= MAX_FILES_QUEUED) {
      logMsg('Too many files in renter queue. Sync aborted.');
      return;
    }

    /* Start sync */
    syncLevel = 0;
    if (!g_syncPause) {
      let fcount = syncFolder(HOMEDIR + '/' + SIADIR, renter, 0);
      if (fcount > 0) {
        showNotification('Started upload of ' + fcount + ' files.');
      }
    }

  });
};

/* Sync a specific folder - function calls itself recursively */
function syncFolder(path, renter, fcount) {
  syncLevel += 1;
  if (syncLevel > SYNC_RECURSION_LIM) {
    showNotification('Reached directory recursion limit (' + SYNC_RECURSION_LIM + ').');
    return fcount;
  }

  /* Get list of local files and directories */
  let files     = [];
  let dirs      = [];
  let file_info = null;
  let children  = null;

  let folder    = Gio.file_new_for_path( path );
  try {
    children = folder.enumerate_children('*', 0, null, null);
  } catch (err) {
    logMsg('Permissions denied on ' + path + ': ' + err);
    return fcount;
  }

  while ((file_info = children.next_file(null, null)) !== null) {
    if (file_info.get_is_hidden()) { continue; }          // skip hidden files
    if (isDirectory(file_info)) { dirs.push(file_info); } // is directory
    else { files.push(file_info); }                       // is file
  }
  children.close(null, null);

  /* Sync files in current folder */
  fcount = syncFiles(path, files, renter, fcount);

  /* Process sub-directories recursively */
  let d;
  for (d = 0; d < dirs.length; d++) {
    fcount = syncFolder(path + '/' + dirs[d].get_name() , renter, fcount);
    if (fcount >= FILE_SYNC_LIMIT) break;
  }

  return fcount;
}

/* Synchronize files with renter */
function syncFiles(path, files, renter, fcount) {
  let f, r;

  for (f = 0; f < files.length; f++) {
    let filename     = files[f].get_name();
    let upload       = true;
    let siaPath      = path + '/' + filename;
    let fileUpdated  = false;

    /* Append path to filename */
    let nickname = siaPath;

    /* Remove root path and leading slash from nickname */
    nickname = nickname.replace(HOMEDIR + '/' + SIADIR + '/', '');
    nickname = SYNCFOLDERNAME + '/' + nickname;

    /* Compare file with files in renter
       Skip files that are already in the renter unless file size is different
    */
    for (var r in renter) {
      if (renter[r]['siapath'] == nickname) {
        let remainingBlocks = renter[r].expiration - g_currentBlock;
        let elapsedBlocks   = DEFAULTDURATION - remainingBlocks;

        /* Do not upload empty files */
        if ( files[f].get_size() === 0 ) {
          logMsg('Will not upload empty file: ' + filename);
          upload = false;
        }

        /* Check if the file has been updated locally */
        else if ( files[f].get_size() !== renter[r].filesize )
          fileUpdated = true;

        /* Do not upload if file has remaining time or is still syncing */
        else if ( remainingBlocks > 0 || renter[r].uploadprogress < 100 ) {
          logMsg('File already in renter: ' + filename);
          upload = false;
        }

        /* Update file icon emblems/overlays */
        let emblem = null;
        if (renter[r].uploadprogress < 100)
          emblem = 'view-refresh';
        if (renter[r].available)
          emblem = 'emblem-default';
        if (renter[r].uploadprogress == 100) // full redundancy reached
          emblem = 'emblem-favorite';
        if ( remainingBlocks > 0 && remainingBlocks < 300 )
          emblem = 'emblem-urgent';
        if (emblem !== null)
          g_fileEmblems.push({path:siaPath, emblem:emblem});

        /* Delete expired files in renter */
        if (remainingBlocks == 0)
          deleteSiaFile(nickname);

        /* Deleted stalled files - defined as 'unavailable' and with start-of-upload time > 48 h/GB ago
           TODO: There is still a risk of stalled files persisting if upload never started.
         */
        let fileSize = renter[r].filesize / Math.pow(1024, 3); // bytes -> GB
        let blocks   = Math.ceil(fileSize) * (6 * 48);
        if (   (!renter[r].available && elapsedBlocks > blocks && renter[r].expiration > 0 ) ) {
          logMsg('Upload of ' + siaPath + ' aborted: ' + JSON.stringify(renter[r]));
          deleteSiaFile(nickname);
        }
        break;
      }
    }

    /* Upload file */
    if (upload && walletUnlocked) {
      /* If a file has been updated, download .sia file into current path and remove from renter.
         The local file will be re-uploaded in the next sync cycle.
      */
      if (fileUpdated) {
        /* Get path */
        let dotsiaPath = siaPath.substring(0, siaPath.lastIndexOf("/"));
        let dotsiaFile = siaPath.split("/").pop();
        dotsiaPath = dotsiaPath + '/.' + dotsiaFile + '.sia';

        /* Download .sia file */
        getJSON('GET', '/renter/share?siapaths=' + nickname + '&destination=' + dotsiaPath, '', checkDownload);
        logMsg('Download .sia of ' + nickname);

        /* Delete file in renter */
        deleteSiaFile(nickname);

      } else {
        getJSON('POST', '/renter/upload/' + nickname, 'source=' + siaPath + '&duration=' + DEFAULTDURATION + '&renew=' + RENEWFILES, checkUpload);
        logMsg('Upload ' + siaPath);
        fcount += 1;
        if (fcount >= FILE_SYNC_LIMIT) return fcount;
      }
    }

    /* Limit number of files synced this cycle (remaining files picked up next cycle) */
    if (fcount >= FILE_SYNC_LIMIT) return fcount;
  }
  return fcount;
}

/* Get number of files in renter that are still syncing */
function getIncompleteFiles(renter) {
  let notavailable = 0;
  for (var r in renter) {
    if ( renter[r].uploadprogress < 100 )
      notavailable += 1;
  }
  return notavailable;
}

/* Update emblems on files and directories
   Emblems are updated sequentially and asynchronously with information provided by
   the global variable g_fileEmblems.
*/
function setEmblems() {
  /* Iterate over g_fileEmblems while its not empty */
  while ( g_fileEmblems.length > 0 ) {
    let emlinfo = g_fileEmblems.shift();

    let priority = GLib.PRIORITY_DEFAULT;
    let cancellable = new Gio.Cancellable();
    let flags = Gio.FileQueryInfoFlags.NONE;

    let file = Gio.File.new_for_path(emlinfo.path);
    file.query_info_async('metadata::emblems', flags, priority, cancellable, (file, res) => {
      let info = file.query_info_finish(res);
      info.set_attribute_stringv('metadata::emblems', [emlinfo.emblem]);
      file.set_attributes_async(info, flags, priority, cancellable, (file, res) => {
        file.set_attributes_finish(res);
      });
    });
  };
}

/* Delete file in renter */
function deleteSiaFile(siapath) {
  getJSON('POST', '/renter/delete/' + siapath, null, function (code, json) {
    let result = JSON.parse(json);
    if (result === null)
      logMsg('Sia: File deletion failed: ' + json);
  });
};

/* Verify new file download and report errors */
function checkDownload(code, json) {
  let result = JSON.parse(json);
  if (result === null)
    logMsg('File download failed: ' + json);
};

/* Verify new file upload and report errors */
function checkUpload(code, json) {
  let result = JSON.parse(json);
  if (result === null)
    logMsg('File upload failed.');
};

/* Update menu with renter statistics */
function updateRenterMenu() {
  /* Get list of files in renter */
  getJSON('GET', '/renter/files', null, function(code, json) {
    let renter = JSON.parse(json);
    if (renter === null) return;
    renter = renter.files;

    let filesSynced = 0;
    let usedStorage = 0;
    let avgRedundancy = 0;
    let r;
    for (r = 0; r < renter.length; r++) {
      usedStorage += renter[r].filesize * (renter[r].uploadprogress / 100) * REDUNDANCY;
      avgRedundancy += renter[r].uploadprogress;
      if (renter[r].available)
        filesSynced += 1;
    }
    usedStorage = usedStorage / Math.pow(1024, 3); // bytes -> GB
    siaMonitor._filesSynced.label.text = filesSynced + ' / ' + r + ' files uploaded';
    siaMonitor._filesRedundancy.label.text = Math.round(avgRedundancy / r) + '% average upload progress';
    siaMonitor._gbUsed.label.text = usedStorage.toFixed(2) + ' GB used';
  });
}

/* Check if Gio object is a directory */
function isDirectory(file) {
  return Gio.FileType.DIRECTORY == file.get_file_type();
}

/* Unlock wallet */
function unlockWallet(password) {
  if (password !== null && password !== '') {
    getJSON('POST', '/wallet/unlock', 'encryptionpassword=' + password, getWalletLockStatus);
  }
};

/* Lock wallet */
function lockWallet() {
    getJSON('POST', '/wallet/lock', null, getWalletLockStatus);  
}

/* Get wallet lock status */
function getWalletLockStatus() {
  getJSON('GET', '/wallet', null, function(code, json) {
    if (json === null) {
      updateWalletLockStatus(false);
    } else {
      let wallet = JSON.parse(json);
      if (wallet.unlocked)
        updateWalletLockStatus(true);
      else
        updateWalletLockStatus(false);
    }
  });
}

/* Run timer functions */
function timerExec() {
  /* Make sure ~/Sia exists */
  createSiaDir();

  /* Update block counter */
  updateBlockCounter();

  /* Update wallet status */
  getWalletLockStatus();

  /* Update wallet balance/pending */
  siaMonitor._updateBalance()

  /* Update renter statistics */
  updateRenterMenu();

  /* Sync, if wallet has positive balance */
  if ( siaMonitor._walletbalance.label.amount > 0 )
    syncSiaFolder();

  /* Update file/directory emblems */
  setEmblems();

  return true;
}

/* Get current block height */
function updateBlockCounter() {
  getJSON('GET', '/consensus', null, function(code, json) {
    let consensus = JSON.parse(json);
    if (consensus !== null) {
      g_currentBlock = consensus.height;
    }
  });
}

/* Display wallet lock status */
function updateWalletLockStatus(unlocked) {
  if (unlocked === null || unlocked === undefined)
    unlocked = false;
  if (unlocked) {
    if ( siaMonitor._walletstatus.label.text.localeCompare('Unlock wallet...') === 0 ) {
      showNotification('Wallet unlocked');
    }
    siaMonitor._walletstatus.label.text = 'Lock wallet...';
    getJSON('GET', '/wallet', null, updateWalletBalance);
  } else {
    siaMonitor._walletstatus.label.text = 'Unlock wallet...';
  }
  walletUnlocked = unlocked;
};

/* Update the wallet balance in menu */
function updateWalletBalance(code, json) {
  let data = JSON.parse(json);

  let unlocked = true;
  if (json === null || json === undefined) unlocked = false;
  else if (!data.unlocked) unlocked = false;

  showWalletUnlockedItems(unlocked);

  if (!unlocked) return;

  let balance   = prettySiacoin( convertSiacoin( data.confirmedsiacoinbalance ) );

  let incoming  = convertSiacoin( data.unconfirmedincomingsiacoins );
  let outcoming = convertSiacoin( data.unconfirmedoutgoingsiacoins );
  let pending = (incoming - outcoming).toFixed(2);
  pending = prettySiacoin( pending );

  /* Check for new ongoing transfers */
  notifyNewTransaction(balance, pending);

  siaMonitor._walletbalance.label.text   = "Balance: " + balance + " SC";
  siaMonitor._walletbalance.label.amount = convertSiacoin( data.confirmedsiacoinbalance );
  siaMonitor._walletpending.label.text   = "Pending: " + pending + " SC";
  siaMonitor._walletpending.label.amount = pending;
}

/* Show/hide items when wallet is unlocked/locked */
function showWalletUnlockedItems(unlocked) {
  if (unlocked) {
    siaMonitor._walletbalance.actor.show();
    siaMonitor._walletpending.actor.show();
    siaMonitor._walletsend.actor.show();
    siaMonitor._walletreceive.actor.show();
    siaMonitor._filesSynced.actor.show();
    siaMonitor._filesRedundancy.actor.show();
    siaMonitor._gbUsed.actor.show();
  } else {
    siaMonitor._walletbalance.actor.hide();
    siaMonitor._walletpending.actor.hide();
    siaMonitor._walletsend.actor.hide();
    siaMonitor._walletreceive.actor.hide();
    siaMonitor._filesSynced.actor.hide();
    siaMonitor._filesRedundancy.actor.hide();
    siaMonitor._gbUsed.actor.hide();
  }
  return;
}

/* Notify about any new transactions */
function notifyNewTransaction(balance, pending) {
  /* Get change in balance */
  let oldbalance = siaMonitor._walletbalance.label.amount;
  if (oldbalance === undefined || oldbalance === null)
    return;
  let dbalance = balance - oldbalance;

  /* Get change in pending */
  let oldpending = siaMonitor._walletpending.label.amount;
  if (oldpending === undefined || oldpending === null)
    return;
  let dpending = pending - oldpending;
  dpending = prettySiacoin(dpending.toFixed(2));

  /* Report changes in pending, except amounts are confirmed */
  if (dpending > 0 && dbalance == 0)
    showNotification('New incoming transfer: ' + dpending + ' SC');
  /* Do not show outgoing transfers. Ends up being annoying during sync. */
  //else if (dpending < 0)
  //  showNotification('New outgoing transfer: ' + dpending + ' SC');
}

/* Prettify a Siacoin amount with commas. Input is a string */
function prettySiacoin(siacoins) {
  if (siacoins === '0' || siacoins === undefined || siacoins === null) return '0';
  siacoins = siacoins.toString();
  return siacoins.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Query REST API and return results string (assumed to be JSON) */
const getJSON = function (method, query, postParams, callback) {
  let url = 'http://localhost:9980' + query;

  let msg = Soup.Message.new(method, url);
  if (postParams !== null) {
    msg.set_request('application/x-www-form-urlencoded', Soup.MemoryUse.COPY, postParams, postParams.length);
  }

  _httpSession.queue_message(msg, function (session, msg) {
      if (msg.status_code == 200) {
        callback(null, msg.response_body.data);
      } else {
        siaMonitor._walletstatus.label.text = 'Sia not running';
        callback(msg.status_code, null);
      }
    }
  );
}

/* Display desktop notification */
function showNotification(text) {
  /* TODO Fix icon so that getIconPath() can be used as source */
  let source = new MessageTray.Source('Sia', 'sia-icon');
  Main.messageTray.add(source);
  let notification = new MessageTray.Notification(source, 'Sia', text);
  notification.setTransient(true);
  source.notify(notification);
}

/* Class for creating menu items with an icon */
const IconMenuItem = new Lang.Class({
    Name: 'IconMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function (text, iconName, style, params) {
        this.parent(params);

        this._icon = new St.Icon({ x_align: St.Align.END, style_class: 'popup-menu-icon' });
        this.actor.add_child(this._icon);
        this._setIcon(iconName);

        this.label = new St.Label({ text: text, style_class: style });
        this.actor.add_child(this.label);
        this.actor.label_actor = this.label
    },

    _setIcon: function(name) {
        this._icon.gicon = this._createIcon(name);
    },

    _createIcon: function(name, params) {
      if (!name)
        return null;
      if (name[0] == '/')
        return Gio.FileIcon.new(Gio.File.new_for_path(name));
      // This is to hack through the gtk silly icon theme code. GTK doesn't want to mix
      // symbolic icon and normal icon together, while in our case, it's much better to
      // show an icon instead of hide everything.
      return Gio.ThemedIcon.new_with_default_fallbacks(name + '-symbolic-hack');
    }
});
