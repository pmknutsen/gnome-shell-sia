const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const ModalDialog = imports.ui.modalDialog;
const ShellEntry = imports.ui.shellEntry;

const InputDialog = new Lang.Class({
  Name : 'InputDialog',
  Extends : ModalDialog.ModalDialog,

  _callback : null,

  _init: function() {
    this.parent({ styleClass: 'sia-prompt-dialog' });

    // Main box with all widgets
    let mainContentBox = new St.BoxLayout({ style_class: 'prompt-dialog-main-layout', vertical: true });
    this.contentLayout.add(mainContentBox, { x_fill: true, y_fill: false });

    // Message box
    let messageBox = new St.BoxLayout({ style_class: 'prompt-dialog-message-layout', vertical: true });
    mainContentBox.add(messageBox, { y_align: St.Align.START });

    // Subject label
    let subjectLabel = new St.Label({ style_class: 'prompt-dialog-headline', text: "Enter receipient and amount to send:"});

    // Address label and input field
    messageBox.add(subjectLabel, { y_fill:  false, y_align: St.Align.START });

    this._addressEntry = new St.Entry({ style_class: 'prompt-dialog-address-entry', hint_text: "Receipient address", text: "", can_focus: true, reactive: true });
    this._addressEntry.clutter_text.connect('activate', Lang.bind(this, this._onOk)); // call onOk after key press
    this._addressEntry.clutter_text.connect('text-changed', Lang.bind(this, this._updateOkButton)); // enable Send on key press
    
    // Create a widget and fill box
    let table = new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'network-dialog-secret-table'});
    let gridLayout = table.layout_manager;
    gridLayout.pack(this._addressEntry, 0, 0);
    messageBox.add(table);

    // Amount input field
    this._amountEntry = new St.Entry({ style_class: 'prompt-dialog-address-entry', hint_text: "Amount", text: "", can_focus: true, reactive: true });
    this._amountEntry.clutter_text.connect('activate', Lang.bind(this, this._onOk)); // call onOk after key press
    this._amountEntry.clutter_text.connect('text-changed', Lang.bind(this, this._updateOkButton)); // enable Send on key press
    
    // Create a widget and fill box
    let table = new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'network-dialog-secret-table'});
    let gridLayout = table.layout_manager;
    gridLayout.pack(this._amountEntry, 0, 0);
    messageBox.add(table);
    
    // Connect and Unlock buttons
    this._okButton = { label:  _("Send Siacoins"),
                       action: Lang.bind(this, this._onOk),
                       key:    Clutter.KEY_Return,
                     };

    this.setButtons([{ label: _("Cancel"),
                       action: Lang.bind(this, this.cancel),
                       key:    Clutter.KEY_Escape,
                     }, this._okButton]);
  },

  set_callback: function(callback) {
    // Check that callback is a function
    if (callback === undefined || callback === null || typeof callback !== "function"){
      throw TypeError("'callback' needs to be a function.");
    }
    this._callback = callback;
  },

  get_address_entry: function() {
    return this._addressEntry.get_text();
  },

  get_amount_entry: function() {
    return this._amountEntry.get_text();
  },
      
  _updateOkButton: function() {
    let address = this.get_address_entry();
    let amount  = this.get_amount_entry();
    
    this._okButton.button.reactive = true; // changes from valid to true
    this._okButton.button.can_focus = true;
    
    if (address.length != 0 || amount.length != 0)
        this._okButton.button.remove_style_pseudo_class('disabled');
    else
        this._okButton.button.add_style_pseudo_class('disabled');
  },
  
  _onOk: function() {
    let address = this.get_address_entry();
    let amount  = this.get_amount_entry();

    /* Require one more click to confirm transaction */
    if ( this._okButton.button.label.localeCompare(_("Send Siacoins")) === 0 ) {
      this._okButton.button.label = _("Confirm?");
      return;
    }

    this.close(global.get_current_time());
    this._callback(address, amount);
  },
  
  cancel: function() {
    this.close(global.get_current_time());
    this._callback(null);
  },
});