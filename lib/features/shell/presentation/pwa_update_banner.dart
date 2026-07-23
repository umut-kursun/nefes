import 'dart:async';

import 'package:flutter/material.dart';
import 'package:nefes/core/design_system/tokens.dart';
import 'package:nefes/core/l10n/app_strings.dart';
import 'package:nefes/features/shell/data/pwa_update.dart';

/// Shows a Material banner when a new PWA shell is ready to reload.
class PwaUpdateBannerHost extends StatefulWidget {
  const PwaUpdateBannerHost({super.key, required this.child});

  final Widget child;

  @override
  State<PwaUpdateBannerHost> createState() => _PwaUpdateBannerHostState();
}

class _PwaUpdateBannerHostState extends State<PwaUpdateBannerHost> {
  StreamSubscription<void>? _sub;
  var _shown = false;

  @override
  void initState() {
    super.initState();
    _sub = watchPwaUpdateAvailable().listen((_) {
      if (!mounted || _shown) return;
      _shown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final messenger = ScaffoldMessenger.of(context);
        messenger
          ..hideCurrentMaterialBanner()
          ..showMaterialBanner(
            MaterialBanner(
              backgroundColor: AppColors.surfaceMuted,
              content: Text(
                AppStrings.updateAvailable,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    messenger.hideCurrentMaterialBanner();
                  },
                  child: const Text(AppStrings.cancel),
                ),
                TextButton(
                  onPressed: () {
                    messenger.hideCurrentMaterialBanner();
                    applyPwaUpdate();
                  },
                  child: const Text(AppStrings.updateNow),
                ),
              ],
            ),
          );
      });
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
