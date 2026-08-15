import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { PAYSTACK_PUBLIC_KEY } from '../config/paystack';

interface PaystackCheckoutProps {
  visible: boolean;
  amount: number; // Naira
  email: string;
  reference: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

function buildCheckoutHtml(opts: { amount: number; email: string; reference: string }) {
  const amountKobo = Math.round(opts.amount * 100);
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>html,body{margin:0;height:100%;background:${colors.background};}</style>
  </head>
  <body>
    <script src="https://js.paystack.co/v1/inline.js"></script>
    <script>
      function post(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
      try {
        var handler = PaystackPop.setup({
          key: ${JSON.stringify(PAYSTACK_PUBLIC_KEY)},
          email: ${JSON.stringify(opts.email)},
          amount: ${amountKobo},
          ref: ${JSON.stringify(opts.reference)},
          currency: 'NGN',
          onClose: function () { post({ type: 'cancel' }); },
          callback: function (response) { post({ type: 'success', reference: response.reference }); }
        });
        handler.openIframe();
      } catch (e) {
        post({ type: 'error', message: String(e) });
      }
    </script>
  </body>
</html>`;
}

export function PaystackCheckout({ visible, amount, email, reference, onSuccess, onCancel }: PaystackCheckoutProps) {
  const [loading, setLoading] = useState(true);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'success') {
        onSuccess(payload.reference ?? reference);
      } else if (payload.type === 'cancel' || payload.type === 'error') {
        onCancel();
      }
    } catch {
      onCancel();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <View style={{ width: 24 }} />
      </View>
      <WebView
        source={{ html: buildCheckoutHtml({ amount, email, reference }) }}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.text },
  webview: { flex: 1, backgroundColor: colors.background },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
