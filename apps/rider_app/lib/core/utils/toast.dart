import 'package:fluttertoast/fluttertoast.dart';

void showAppToast(String message, {bool long = false}) {
  Fluttertoast.showToast(
    msg: message,
    toastLength: long ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT,
    gravity: ToastGravity.BOTTOM,
  );
}
