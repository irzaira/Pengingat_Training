package com.pengingat.license;

import android.Manifest;
import android.os.Build;
import android.telephony.SmsManager;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "SmsSender",
    permissions = { @Permission(strings = { Manifest.permission.SEND_SMS }, alias = "sms") }
)
public class SmsSenderPlugin extends Plugin {

    @PluginMethod
    public void send(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        doSend(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            doSend(call);
        } else {
            call.reject("Izin kirim SMS ditolak");
        }
    }

    private void doSend(PluginCall call) {
        String to = call.getString("to");
        String message = call.getString("message");
        if (to == null || to.isEmpty() || message == null || message.isEmpty()) {
            call.reject("Nomor atau pesan kosong");
            return;
        }
        try {
            SmsManager sms = Build.VERSION.SDK_INT >= 31
                ? getContext().getSystemService(SmsManager.class)
                : SmsManager.getDefault();
            ArrayList<String> parts = sms.divideMessage(message);
            sms.sendMultipartTextMessage(to, null, parts, null, null);
            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal kirim SMS: " + e.getMessage());
        }
    }
}
