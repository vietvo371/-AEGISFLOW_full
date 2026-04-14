# API Services - Quick Reference

Cheat sheet nhanh cho các API services đã được cập nhật.

## Import Services

```typescript
// Import individual service
import { reportService } from '../services/reportService';

// Or import multiple services
import { 
  authService, 
  reportService, 
  commentService,
  statsService 
} from '../services';
```

## Authentication

```typescript
// Login
const { user, token } = await authService.login({ email, mat_khau, remember });

// Get current user
const user = await authService.getProfile();

// Update profile
await authService.updateProfile({ ho_ten, so_dien_thoai });

// Change password
await authService.changePassword({ mat_khau_cu, mat_khau_moi, mat_khau_moi_confirmation });

// Logout
await authService.logout();
```

## Reports

```typescript
// List reports
const reports = await reportService.getReports({ page: 1, danh_muc: 0 });

// Create report
await reportService.createReport({
  tieu_de: '...',
  mo_ta: '...',
  danh_muc: 0,
  vi_do: 10.7769,
  kinh_do: 106.7009,
  dia_chi: '...',
  media_ids: [1, 2]
});

// Vote
await reportService.voteReport(reportId, 'upvote');

// Rate
await reportService.rateReport(reportId, 5);
```

## Comments

```typescript
// Get comments
const comments = await commentService.getComments(reportId, page);

// Add comment
await commentService.addComment(reportId, 'Nội dung');

// Update comment
await commentService.updateComment(commentId, 'Nội dung mới');

// Delete
await commentService.deleteComment(commentId);

// Like/unlike
await commentService.likeComment(commentId);
await commentService.unlikeComment(commentId);
```

## Media

```typescript
// Upload
const media = await mediaService.uploadMedia(file, 'image', 'phan_anh', 'Mô tả');

// Get my media
const myMedia = await mediaService.getMyMedia({ page: 1, type: 'image' });

// Delete
await mediaService.deleteMedia(mediaId);
```

## Statistics

```typescript
// Overview
const overview = await statsService.getOverviewStats();

// Categories
const categories = await statsService.getCategoriesStats();

// Timeline
const timeline = await statsService.getTimelineStats('7d'); // '7d' | '30d' | '90d' | '1y'

// Leaderboard
const leaderboard = await statsService.getLeaderboard(10);

// City stats
const cityStats = await statsService.getCityStats();
```

## Agencies

```typescript
// List agencies
const agencies = await agencyService.getAgencies();

// Agency detail
const agency = await agencyService.getAgencyDetail(agencyId);

// Agency reports
const reports = await agencyService.getAgencyReports(agencyId, page);

// Agency stats
const stats = await agencyService.getAgencyStats(agencyId);
```

## User Profiles

```typescript
// Public profile
const profile = await userService.getUserProfile(userId);

// User reports
const reports = await userService.getUserReports(userId, page);

// User stats
const stats = await userService.getUserStats(userId);
```

## Notifications

```typescript
// All notifications
const notifs = await notificationService.getNotifications({ page: 1 });

// Unread only
const unread = await notificationService.getUnreadNotifications();

// Unread count
const { count } = await notificationService.getUnreadCount();

// Mark as read
await notificationService.markAsRead(notifId);
await notificationService.markAllAsRead();

// Delete
await notificationService.deleteNotification(notifId);

// Settings
await notificationService.updateSettings({
  push_enabled: true,
  report_updates: true
});
```

## Wallet

```typescript
// Balance
const wallet = await walletService.getWalletInfo();

// Transactions
const transactions = await walletService.getTransactions({ page: 1, type: 'all' });

// Rewards
const rewards = await walletService.getRewards(1);

// Redeem
await walletService.redeemReward(rewardId, quantity);
```

## Map

```typescript
// Reports on map
const reports = await mapService.getMapReports(bounds);

// Heatmap (last 7 days)
const heatmap = await mapService.getHeatmap(7);

// Clusters
const clusters = await mapService.getClusters(12);

// Reverse geocode
const address = await mapService.reverseGeocode(lat, long);
```

## Error Handling

```typescript
try {
  const result = await reportService.createReport(data);
  // Success
} catch (error: any) {
  if (error.response?.status === 422) {
    // Validation error
    console.log('Errors:', error.response.data.errors);
  } else if (error.response?.status === 401) {
    // Unauthorized - handled by interceptor
  } else {
    // Other errors
    console.error(error.message);
  }
}
```

## Response Format

All API responses follow this format:

```typescript
{
  "success": true,
  "message": "Success message",
  "data": { /* actual data */ }
}
```

Access data via: `response.data` (already extracted by services)
