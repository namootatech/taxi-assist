/// Bank payout details (business-logic.md §2.1).
class BankDetails {
  const BankDetails({
    this.accountHolder,
    this.bankName,
    this.accountNumber,
    this.branchCode,
  });

  final String? accountHolder;
  final String? bankName;
  final String? accountNumber;
  final String? branchCode;

  factory BankDetails.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const BankDetails();
    return BankDetails(
      accountHolder: json['account_holder'] as String? ?? json['accountHolder'] as String?,
      bankName: json['bank_name'] as String? ?? json['bankName'] as String?,
      accountNumber: json['account_number'] as String? ?? json['accountNumber'] as String?,
      branchCode: json['branch_code'] as String? ?? json['branchCode'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        if (accountHolder != null) 'account_holder': accountHolder,
        if (bankName != null) 'bank_name': bankName,
        if (accountNumber != null) 'account_number': accountNumber,
        if (branchCode != null) 'branch_code': branchCode,
      };
}
