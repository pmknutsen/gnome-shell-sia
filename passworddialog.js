const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const ModalDialog = imports.ui.modalDialog;
const ShellEntry = imports.ui.shellEntry;

const PasswordDialog = new Lang.Class({
  Name : 'PasswordDialog',
  Extends : ModalDialog.ModalDialog,

  _callback : null,

  _init: function() {
    this.parent({ styleClass: 'sia-prompt-dialog' });

    // Main box which we'll put all widgets in
    let mainContentBox = new St.BoxLayout({ style_class: 'prompt-dialog-main-layout', vertical: false });
    this.contentLayout.add(mainContentBox, { x_fill: true, y_fill: false });

    // Sets a message box
    let messageBox = new St.BoxLayout({ style_class: 'prompt-dialog-message-layout', vertical: true });
    mainContentBox.add(messageBox, { y_align: St.Align.START });

    // Puts a text on the box, asking for a password
    let subjectLabel = new St.Label({ style_class: 'prompt-dialog-headline', text: "Type in your Sia wallet password:"});
    messageBox.add(subjectLabel, { y_fill:  false, y_align: St.Align.START });
    
    // An entry for putting the password
    this._passwdEntry = new St.Entry({ style_class: 'prompt-dialog-password-entry', text: "", can_focus: true, reactive: true });

    ShellEntry.addContextMenu(this._passwdEntry, { isPassword: true });
    
    // Calls onOk when enter is pressed
    this._passwdEntry.clutter_text.connect('activate', Lang.bind(this, this._onOk)); // ADDED Underscore _onOk
    
    // Updates the connect button so that you can't press it if text is empty
    this._passwdEntry.clutter_text.connect('text-changed', Lang.bind(this, this._updateOkButton));
    
    // Changes the way the password is shown
    this._passwdEntry.clutter_text.set_password_char('\u25cf');
          
    // Creates a widget so that we can fill up the box.
    let table = new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'network-dialog-secret-table'});
    let gridLayout = table.layout_manager;
    gridLayout.pack(this._passwdEntry, 0, 0);
    messageBox.add(table);
    
    // Connect and Unlock buttons
    this._okButton = { label:  _("Unlock"),
                       action: Lang.bind(this, this._onOk),
                       key:    Clutter.KEY_Return,
                     };

    this.setButtons([{ label: _("Cancel"),
                       action: Lang.bind(this, this.cancel),
                       key:    Clutter.KEY_Escape,
                     }, this._okButton]);

    /* Give entry field focus DOES NOT WORK */
    global.stage.set_key_focus(this._passwdEntry);
  },

  set_callback: function(callback) {
    // Check that callback is a function
    if (callback === undefined || callback === null || typeof callback !== "function"){
      throw TypeError("'callback' needs to be a function.");
    }
    this._callback = callback;
  },

  get_password_entry: function() {
    return this._passwdEntry.get_text();
  },
      
  _updateOkButton: function() {
    let passwd = this.get_password_entry();
    
    this._okButton.button.reactive = true; // changes from valid to true
    this._okButton.button.can_focus = true;
    
    if (passwd.length != 0)
        this._okButton.button.remove_style_pseudo_class('disabled');
    else
        this._okButton.button.add_style_pseudo_class('disabled');
  },
  
  _onOk: function() {
    let passwd = this.get_password_entry();
    this.close(global.get_current_time());
    this._callback(passwd);
  },
  
  cancel: function() {
    this.close(global.get_current_time());
    this._callback(null);
  },
});