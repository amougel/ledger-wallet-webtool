import React, { Component } from "react";
import {
  Button,
  Checkbox,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert,
  DropdownButton,
  MenuItem
} from "react-bootstrap";
import Networks from "./Networks";
import { initialize } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";
import Errors from "./Errors";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";
import HDAddress from "./HDAddress"

class SendRawAPDU extends Component {
  hdAddress = new HDAddress();

  constructor(props) {
    super();
    this.state = {
      scrambleKey: "",
      rawAPDU: "",
      responseAPDU: "",
      utf8Response: "",
      error: false,
      warning: false,
      done: false,
      running: false,
    };
  }

  onError = e => {
    this.setState({
      error: e.toString(),
      warning: false,
      running: false,
      done: false,
    });
  };


  handleChangeScrambleKey = e => {
    this.setState({ scrambleKey: e.target.value });
  };

  handleChangeRawAPDU = e => {
    this.setState({ rawAPDU: e.target.value });
  };

  send = async () => {

    this.setState({
      running: true,
      done: false,
      error: false
    });

    try
    {
      const apdu = Buffer.from(this.state["rawAPDU"], "hex")

      if (apdu[4] != apdu.length - 5) {
        let wrong_len = apdu[4];
        apdu[4] = apdu.length - 5
        this.setState({warning: "APDU length (byte n°5) has been updated from " + String(wrong_len) + " to " + String(apdu[4]) + " for correctness"});
      }

      const devices = await Transport.list();
      if (devices.length === 0) throw "no device";
      const transport = await Transport.open(devices[0]);
      transport.setScrambleKey(this.state["scrambleKey"])
      transport.setExchangeTimeout(30000);
      transport.setDebugMode(true);

      const x = await transport.exchange(apdu);
      this.setState({
        running: false,
        warning: false,
        done: true,
        responseAPDU: x.toString("hex"),
        utf8Response: x.toString("utf8")
      })
    } 
    catch(e)
    {
      this.onError(e);
    }

  };


  render() {
    var coinSelect = [];
    for (var coin in Networks) {
      if (Networks.hasOwnProperty(coin)) {
        coinSelect.push(
          <option value={coin} key={coin} selected={coin === this.state.coin}>
            {Networks[coin].name}
          </option>
        );
      }
    }
    return (
      <div className="SendRawAPDU">
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.error}</p>
          </Alert>
        )}
        {this.state.warning && (
          <Alert bsStyle="warning">
            <strong>Warning</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.warning}</p>
          </Alert>
        )}
        {this.state.running && (
          <Alert bsStyle="info">
            <strong>Success</strong>
            <p style={{ wordWrap: "break-word" }}>{"APDU sent successfully !"}</p>
          </Alert>
        )}
        {this.state.done && (
          <Alert bsStyle="success">
            <strong>Success</strong>
            <p style={{ wordWrap: "break-word" }}>{"APDU response received !"}</p>
          </Alert>
        )}
        <ControlLabel>U2F Scramble Key</ControlLabel>
        <FormControl
          type="text"
          value={this.state.scrambleKey}
          disabled={this.state.running}
          onChange={this.handleChangeScrambleKey}
        />
        <ControlLabel>Raw APDU</ControlLabel>
        <FormControl
          componentClass="textarea"
          value={this.state.rawAPDU}
          placeholder="Raw APDU as hex string here (eg: E04001000D038000002C8000002A80000000)"
          disabled={this.state.running}
          onChange={this.handleChangeRawAPDU}
        />
        
        <ButtonToolbar>
          <Button
            bsStyle="primary"
            bsSize="large"
            disabled={this.state.running}
            onClick={this.send}
            disabled={this.state.running || this.state.rawAPDU.length === 0 || this.state.scrambleKey.length === 0}
          >
            Send
          </Button>
        </ButtonToolbar>

        <ControlLabel>Response APDU</ControlLabel>
        <FormControl
          componentClass="textarea"
          value={this.state.responseAPDU}
          disabled
        />
        <ControlLabel>Response APDU (utf-8)</ControlLabel>
        <FormControl
          componentClass="textarea"
          value={this.state.utf8Response}
          disabled
        />
      </div>
    );
  }
}

export default SendRawAPDU;
