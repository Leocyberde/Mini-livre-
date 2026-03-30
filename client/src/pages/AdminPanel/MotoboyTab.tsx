import React from 'react';
import { Order } from '@/lib/mockData';
import { AdminMotoboy } from './types';
import { CompletedRoute } from '@/contexts/MotoboyContext';
import MbKpiCards from './motoboy/MbKpiCards';
import MbList from './motoboy/MbList';
import MbDetailView from './motoboy/MbDetailView';
import MbBalanceDialog from './motoboy/dialogs/MbBalanceDialog';
import MbBlockDialog from './motoboy/dialogs/MbBlockDialog';
import MbRemoveRouteDialog from './motoboy/dialogs/MbRemoveRouteDialog';
import MbNotifDialog from './motoboy/dialogs/MbNotifDialog';

interface MotoboyTabProps {
  mbListWithContext: AdminMotoboy[];
  selectedMbId: string | null;
  setSelectedMbId: (id: string | null) => void;
  selectedMb: AdminMotoboy | null;
  mbDetailTab: 'profile' | 'orders';
  setMbDetailTab: (t: 'profile' | 'orders') => void;
  balanceDialog: { mbId: string; mbName: string } | null;
  setBalanceDialog: (v: { mbId: string; mbName: string } | null) => void;
  balanceAmount: string;
  setBalanceAmount: (v: string) => void;
  balanceType: 'add' | 'deduct';
  setBalanceType: (v: 'add' | 'deduct') => void;
  blockDialog: { mbId: string; mbName: string } | null;
  setBlockDialog: (v: { mbId: string; mbName: string } | null) => void;
  blockType: 'permanent' | 'hours' | 'days';
  setBlockType: (v: 'permanent' | 'hours' | 'days') => void;
  blockDuration: string;
  setBlockDuration: (v: string) => void;
  blockReason: string;
  setBlockReason: (v: string) => void;
  notifMbDialog: { mbId: string; mbName: string } | null;
  setNotifMbDialog: (v: { mbId: string; mbName: string } | null) => void;
  notifMbTitle: string;
  setNotifMbTitle: (v: string) => void;
  notifMbBody: string;
  setNotifMbBody: (v: string) => void;
  removeRouteConfirm: string | null;
  setRemoveRouteConfirm: (v: string | null) => void;
  handleMbBalance: () => void;
  handleMbBlock: () => void;
  handleMbUnblock: (mbId: string, mbName: string) => void;
  handleMbRemoveRoute: (mbId: string) => void;
  handleMbSendNotif: () => void;
  handleMbMarkDelivered: (orderId: string) => void;
  expandedOrders: Set<string>;
  toggleOrderExpand: (id: string) => void;
  motoboyCompletedRoutes: CompletedRoute[];
  allOrders: Order[];
  statusLabel: (s: string) => string;
  statusIcon: (s: string) => React.ReactElement;
  fmtDateTime: (ts: string | null | undefined) => string;
  formatDate: (iso: string) => string;
}

export default function MotoboyTab({
  mbListWithContext,
  selectedMbId,
  setSelectedMbId,
  selectedMb,
  mbDetailTab,
  setMbDetailTab,
  balanceDialog,
  setBalanceDialog,
  balanceAmount,
  setBalanceAmount,
  balanceType,
  setBalanceType,
  blockDialog,
  setBlockDialog,
  blockType,
  setBlockType,
  blockDuration,
  setBlockDuration,
  blockReason,
  setBlockReason,
  notifMbDialog,
  setNotifMbDialog,
  notifMbTitle,
  setNotifMbTitle,
  notifMbBody,
  setNotifMbBody,
  removeRouteConfirm,
  setRemoveRouteConfirm,
  handleMbBalance,
  handleMbBlock,
  handleMbUnblock,
  handleMbRemoveRoute,
  handleMbSendNotif,
  handleMbMarkDelivered,
  expandedOrders,
  toggleOrderExpand,
  motoboyCompletedRoutes,
  allOrders,
  statusLabel,
  statusIcon,
  fmtDateTime,
  formatDate,
}: MotoboyTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Platform KPIs row ─────────────────────────────────────────── */}
      <MbKpiCards mbListWithContext={mbListWithContext} />

      {selectedMbId && selectedMb ? (
        /* ── DETAIL VIEW ─────────────────────────────────────────────── */
        <MbDetailView
          selectedMb={selectedMb}
          setSelectedMbId={setSelectedMbId}
          mbDetailTab={mbDetailTab}
          setMbDetailTab={setMbDetailTab}
          setBalanceDialog={setBalanceDialog}
          setBalanceType={setBalanceType}
          setRemoveRouteConfirm={setRemoveRouteConfirm}
          handleMbUnblock={handleMbUnblock}
          setBlockDialog={setBlockDialog}
          setNotifMbDialog={setNotifMbDialog}
          handleMbMarkDelivered={handleMbMarkDelivered}
          expandedOrders={expandedOrders}
          toggleOrderExpand={toggleOrderExpand}
          motoboyCompletedRoutes={motoboyCompletedRoutes}
          allOrders={allOrders}
          statusLabel={statusLabel}
          statusIcon={statusIcon}
          fmtDateTime={fmtDateTime}
          formatDate={formatDate}
        />
      ) : (
        /* ── MOTOBOY LIST ─────────────────────────────────────────────── */
        <MbList
          mbListWithContext={mbListWithContext}
          setSelectedMbId={setSelectedMbId}
          setMbDetailTab={setMbDetailTab}
          setNotifMbDialog={setNotifMbDialog}
          handleMbUnblock={handleMbUnblock}
          setBlockDialog={setBlockDialog}
        />
      )}

      {/* ── Motoboy Dialogs ───────────────────────────────────────────────── */}
      <MbBalanceDialog
        balanceDialog={balanceDialog}
        setBalanceDialog={setBalanceDialog}
        balanceAmount={balanceAmount}
        setBalanceAmount={setBalanceAmount}
        balanceType={balanceType}
        setBalanceType={setBalanceType}
        handleMbBalance={handleMbBalance}
      />
      <MbBlockDialog
        blockDialog={blockDialog}
        setBlockDialog={setBlockDialog}
        blockType={blockType}
        setBlockType={setBlockType}
        blockDuration={blockDuration}
        setBlockDuration={setBlockDuration}
        blockReason={blockReason}
        setBlockReason={setBlockReason}
        handleMbBlock={handleMbBlock}
      />
      <MbRemoveRouteDialog
        removeRouteConfirm={removeRouteConfirm}
        setRemoveRouteConfirm={setRemoveRouteConfirm}
        handleMbRemoveRoute={handleMbRemoveRoute}
      />
      <MbNotifDialog
        notifMbDialog={notifMbDialog}
        setNotifMbDialog={setNotifMbDialog}
        notifMbTitle={notifMbTitle}
        setNotifMbTitle={setNotifMbTitle}
        notifMbBody={notifMbBody}
        setNotifMbBody={setNotifMbBody}
        handleMbSendNotif={handleMbSendNotif}
      />
    </div>
  );
}
