import { currentUser } from '@clerk/nextjs/server';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Your interview sessions will
          appear here.
        </Typography>
      </Paper>
    </Box>
  );
}
