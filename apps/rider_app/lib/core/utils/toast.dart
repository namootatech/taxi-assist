import 'package:fluttertoast/fluttertoast.dart';

import 'app_log.dart';

void showAppToast(String message, {bool long = false}) {
  AppLog.d('ui.toast', message);
  Fluttertoast.showToast(
    msg: message,
    toastLength: long ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT,
    gravity: ToastGravity.BOTTOM,
  );
}
