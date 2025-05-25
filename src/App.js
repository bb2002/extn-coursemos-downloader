import React, { useEffect, useState } from "react";
import "./App.css";
import useSWR from "swr";
import {
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Button,
} from "@mui/material";
import {
  Close as CloseIcon,
  VideoFile as VideoFileIcon,
} from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const HOST =
  "https://func-coursemosdown-c4f5budye9gthda4.koreacentral-01.azurewebsites.net";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    background: {
      paper: "#ffffff",
      default: "#f0f0f0",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #ccc",
        },
      },
    },
  },
});

function App() {
  const [instId, setInstId] = useState(null);
  const [files, setFiles] = useState([]);

  const { data, error, isLoading } = useSWR(
    instId
      ? `${HOST}/api/getVideoDownloadsStatus?installtionId=${instId}`
      : null,
    fetcher,
    {
      refreshInterval: 1000,
    }
  );

  useEffect(() => {
    chrome.storage.local.get("installationId", ({ installationId }) => {
      if (installationId) {
        setInstId(installationId);
      } else {
        const newId = crypto.randomUUID();
        chrome.storage.local.set({ installationId: newId }).then();
        setInstId(newId);
      }
    });
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    (async () => {
      const allRequests = await chrome.storage.local.get(null);
      const files = [];

      for (const d of data) {
        const requestItem = allRequests[d.requestId];
        if (d.status === "COMPLETED") {
          const requestOptions = {
            method: "GET",
            redirect: "follow",
          };
          const res = await fetch(
            "https://func-coursemosdown-c4f5budye9gthda4.koreacentral-01.azurewebsites.net/api/getVideoDownloadUrl?blobId=" +
              d.blobId,
            requestOptions
          );

          if (res.ok) {
            const json = await res.json();
            if (json && json.sasUrl) {
              files.push({
                ...d,
                ...requestItem,
                sasUrl: json.sasUrl,
              });
            }
          }
        } else {
          files.push({
            ...d,
            ...requestItem,
          });
        }
      }

      for (const f of files) {
        if (f.status === "COMPLETED" && f.downloaded === false) {
          f.downloaded = true;
          allRequests[f.requestId] = {
            ...allRequests[f.requestId],
            downloaded: true,
          };
          chrome.downloads.download(
            {
              url: f.sasUrl,
              filename: f.filename,
              conflictAction: "uniquify",
              saveAs: false,
            },
            null
          );
        }
      }

      await chrome.storage.local.set(allRequests);
      console.log(files);
      setFiles(files);
    })();
  }, [data]);

  const handleDownload = (sasUrl, filename) => {
    chrome.downloads.download(
      {
        url: sasUrl,
        filename: filename,
        conflictAction: "uniquify",
        saveAs: false,
      },
      null
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="App">
        <Paper
          className="file-list-container"
          elevation={0}
          sx={{
            width: 380,
            backgroundColor: "background.default",
            border: "1px solid #ccc",
          }}
        >
          {/* Header */}
          <AppBar
            position="static"
            color="inherit"
            sx={{
              backgroundColor: "white",
              color: "text.primary",
            }}
          >
            <Toolbar
              variant="dense"
              sx={{
                minHeight: 48,
                px: 1.5,
              }}
            >
              <Typography
                variant="subtitle2"
                component="div"
                sx={{
                  flexGrow: 1,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                코스모스 다운로더
              </Typography>
              <IconButton
                size="small"
                onClick={() => window.close()}
                sx={{
                  width: 16,
                  height: 16,
                  p: 0.25,
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Toolbar>
          </AppBar>

          {isLoading && (
            <Box sx={{ width: "100%" }}>
              <LinearProgress />
            </Box>
          )}

          <List
            sx={{
              maxHeight: 400,
              overflow: "auto",
              p: 0,
              "& .MuiListItem-root": {
                borderBottom: "1px solid #ddd",
                backgroundColor: "background.default",
                "&:hover": {
                  backgroundColor: "#e0e0e0",
                },
              },
            }}
          >
            {files &&
              files.map((file) => (
                <ListItem
                  key={file.requestId}
                  sx={{
                    py: 1,
                    px: 1.5,
                  }}
                  style={{
                    height: 72,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <VideoFileIcon
                      sx={{
                        fontSize: 16,
                        color: "#333",
                      }}
                    />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 14,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.filename}
                      </Typography>
                    }
                    secondary={
                      <Box
                        sx={{
                          mt: 0.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {["QUEUED", "DOWNLOADING", "ENCODING"].includes(
                          file.status
                        ) && (
                          <Box sx={{ width: "100%" }}>
                            <LinearProgress />
                          </Box>
                        )}
                        {["COMPLETED"].includes(file.status) && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() =>
                              handleDownload(file.sasUrl, file.filename)
                            }
                            sx={{
                              fontSize: 12,
                              minWidth: "auto",
                              p: 0,
                              textTransform: "none",
                            }}
                          >
                            다시 다운로드
                          </Button>
                        )}

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          align="left"
                          sx={{
                            fontSize: 12,
                          }}
                        >
                          {[
                            "FILRNAME_FORMAT_FAULT",
                            "MEDIA_FORMAT_ERROR",
                          ].includes(file.status) && "지원하지 않는 파일"}

                          {["ENCODING_FAULT"].includes(file.status) &&
                            "인코딩 오류"}

                          {file.status.startsWith("DOWNLOAD_FAILED") &&
                            "서버 네트워크 오류"}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            {data && data.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      다운로드 중인 파일이 없습니다
                    </Typography>
                  }
                />
              </ListItem>
            )}
            {error && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="error" align="center">
                      네트워크 또는 서버 오류입니다.
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default App;
