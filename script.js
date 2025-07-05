// ==UserScript==
// @name         bulk_delete_chatgpt
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add bulk delete UI to chat gpt (New UI)
// @author       Base by Shmuel Kamensky, Updated by B1TV-670, Adapted for new UI
// @match        https://chatgpt.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/B1TV-670/bulk_delete_chatgpt_tampermonkey/refs/heads/main/script.js
// @updateURL    https://raw.githubusercontent.com/B1TV-670/bulk_delete_chatgpt_tampermonkey/refs/heads/main/script.js
// ==/UserScript==

(function () {
  "use strict";

  let allInputElements = [];

  const style = document.createElement('style');
  style.textContent = `
  /* Gradient border buttons */
  .gradient-border-btn-red {
    border: 1px solid transparent;
    border-radius: 8px;
    background:
      linear-gradient(#2d2d2d, #2d2d2d) padding-box,
      linear-gradient(45deg, #f00, #111313) border-box;
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .gradient-border-btn-blue {
    border: 1px solid transparent;
    border-radius: 8px;
    background:
      linear-gradient(#2d2d2d, #2d2d2d) padding-box,
      linear-gradient(45deg, #00ffe7, #111313) border-box;
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .gradient-border-btn-green {
    border: 1px solid transparent;
    border-radius: 8px;
    background:
      linear-gradient(#2d2d2d, #2d2d2d) padding-box,
      linear-gradient(45deg, #00ff04, #111313) border-box;
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .gradient-border-btn-yellow {
    border: 1px solid transparent;
    border-radius: 8px;
    background:
      linear-gradient(#2d2d2d, #2d2d2d) padding-box,
      linear-gradient(45deg, #ffcb00, #111313) border-box;
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  /* Checkbox styling */
  .customCheckbox {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    margin-right: 8px;
    border: 1px solid transparent;
    background:
      linear-gradient(#e5e7eb, #e5e7eb) padding-box,
      linear-gradient(45deg, #ffcb00, #111313) border-box;
    position: relative;
    cursor: pointer;
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .dark .customCheckbox {
    background:
      linear-gradient(#374151, #374151) padding-box,
      linear-gradient(45deg, #ffcb00, #111313) border-box;
  }

  .customCheckbox:checked::before {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    font-weight: bold;
    color: white;
  }

  .dark .customCheckbox:checked::before {
    color: #e5e7eb;
  }

  .customCheckbox {
    outline: none !important;
    box-shadow: none !important;
  }

  .customCheckbox:focus {
    outline: none !important;
    box-shadow: none !important;
  }

  .customCheckbox:active {
    outline: none !important;
    box-shadow: none !important;
  }

  /* Adjustments for new UI */
  .__menu-item {
    position: relative;
  }
  `;
  document.head.appendChild(style);

  const globalData = {};

  const initGlobalData = () => {
    globalData.token = "";
    globalData.tokenError = false;
    globalData.selectedChats = {};
    globalData.extensionOutdated = false;
  };

  const checkBoxHandler = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = e.target;
    const chatItem = input.closest("a[href*='/c/']");
    if (!chatItem) return;

    const href = chatItem.getAttribute("href");
    const chatId = href.split("/c/")[1]?.split("?")[0];
    const titleSpan = chatItem.querySelector(".truncate span") || chatItem.querySelector(".truncate");
    const title = titleSpan ? titleSpan.textContent : "Untitled";

    if (!chatId) {
      input.checked = false;
      input.disabled = true;
      input.style.opacity = 0.5;
      globalData.extensionOutdated = true;
      return;
    }

    let freshInput = null;
    allInputElements.forEach(currentInput => {
      if (currentInput.id === chatId) {
        freshInput = currentInput;
      }
    });

    if (!freshInput) {
      freshInput = input;
    }

    // Update selection based on checkbox state
    if (freshInput.checked) {
      globalData.selectedChats[chatId] = {
        id: chatId,
        text: title,
        element: chatItem
      };
    } else {
      delete globalData.selectedChats[chatId];
    }
  };

  const addCheckboxesToChatsIfNeeded = () => {
    allInputElements = []; // Reset the array
    const chats = document.querySelectorAll('a[href*="/c/"]');

    chats.forEach((chat) => {
      if (chat.dataset.processed) return;
      chat.dataset.processed = "true";

      // More robust container detection
      let container = null;
      const possibleContainers = [
        chat.querySelector('.flex.min-w-0.grow.items-center'),
        chat.querySelector('.truncate').parentElement
      ];

      for (const possibleContainer of possibleContainers) {
        if (possibleContainer) {
          container = possibleContainer;
          break;
        }
      }

      if (!container) return;

      let inputElement = container.querySelector(".customCheckbox");

      if (!inputElement) {
        inputElement = document.createElement("input");
        inputElement.setAttribute("type", "checkbox");
        inputElement.setAttribute("class", "customCheckbox");
        inputElement.addEventListener('change', checkBoxHandler);

        const href = chat.getAttribute("href");
        const chatId = href.split("/c/")[1]?.split("?")[0];
        const titleSpan = chat.querySelector(".truncate span") || chat.querySelector(".truncate");
        const title = titleSpan ? titleSpan.textContent : "Untitled";

        if (chatId) {
          inputElement.id = chatId;
          container.insertBefore(inputElement, container.firstChild);

          // Add click handler for the chat item
          chat.onclick = (e) => {
            if (e.target.tagName !== 'INPUT' && !e.target.closest('input')) {
              e.stopPropagation();
              e.preventDefault();

              // Toggle the checkbox
              inputElement.checked = !inputElement.checked;

              // Trigger change event
              const event = new Event('change', {
                bubbles: true,
                cancelable: true,
              });
              inputElement.dispatchEvent(event);
            }
          };
        }
      }

      // Store reference to this checkbox
      allInputElements.push(inputElement);
    });
  };

  const closeDialog = () => {
    const dialogElement = document.getElementById("customDeleteDialogModal");
    if (dialogElement) dialogElement.remove();
    const inputs = document.querySelectorAll(".customCheckbox");
    inputs.forEach((input) => {
      input.disabled = false;
    });
  };

  const getSecChUaString = () => {
    if (navigator.userAgentData && navigator.userAgentData.brands) {
      return navigator.userAgentData.brands
        .map((brand) => {
          return `"${brand.brand}";v="${brand.version}"`;
        })
        .join(", ");
    } else {
      return '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"';
    }
  };

  const getPlatform = () => {
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      return navigator.userAgentData.platform;
    } else {
      return `"Linux"`;
    }
  };

  const getToken = () => {
    return fetch("https://chatgpt.com/api/auth/session", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua": getSecChUaString(),
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": getPlatform(),
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      referrer: "https://chatgpt.com/",
      referrerPolicy: "same-origin",
    })
      .then((res) => res.json())
      .then((res) => {
        globalData.token = res.accessToken;
        return res.accessToken;
      })
      .catch((err) => {
        console.log(err);
        globalData.tokenError = true;
      });
  };

  const doDelete = (chatId) => {
    return fetch(`https://chatgpt.com/backend-api/conversation/${chatId}`, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US",
        authorization: `Bearer ${globalData.token}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua": getSecChUaString(),
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": getPlatform(),
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      referrer: `https://chatgpt.com/c/${chatId}`,
      referrerPolicy: "same-origin",
      body: '{"is_visible":false}',
      method: "PATCH",
      mode: "cors",
      credentials: "include",
    }).then((res) => res.json());
  };

  const setDialogError = (error) => {
    const errorDiv = document.getElementById("customErrorDiv");
    if (errorDiv) {
      errorDiv.innerHTML = `<span style="color:red;">${error}</span>`;
    }
  };

  const deleteSelectedChats = () => {
    const selectedChatIds = Object.keys(globalData.selectedChats);
    const doDeleteLocal = (chatId) => {
      const dialogChatElement = document.getElementById(`custom${chatId}`);
      return doDelete(chatId)
        .then((res) => {
          if (res.success || res.success === false) {
            // Mark as deleted in UI
            const chatElement = globalData.selectedChats[chatId].element;
            if (chatElement) {
              chatElement.style.opacity = "0.5";
              chatElement.style.textDecoration = "line-through";
            }

            delete globalData.selectedChats[chatId];

            if (dialogChatElement) {
              dialogChatElement.innerHTML = `<s>${dialogChatElement.innerHTML}</s>`;
              dialogChatElement.style.color = "green";
            }
          } else if (dialogChatElement) {
            dialogChatElement.innerHTML = `<span style="color:red;">Error deleting ${dialogChatElement.innerHTML}</span>`;
          }
        })
        .catch((err) => {
          console.log("unexpected doDelete failure", err);
          if (dialogChatElement) {
            dialogChatElement.innerHTML = `<span style="color:red;">Error deleting ${dialogChatElement.innerHTML}</span>`;
          }
        });
    };

    const deletePromises = selectedChatIds.map((chatId, index) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(doDeleteLocal(chatId));
        }, 100 * index);
      });
    });

    const done = () => {
      const dialogElement = document.getElementById("customDeleteDialog");
      if (dialogElement) {
        const cancelBtn = dialogElement.querySelector(".customCancelButton");
        if (cancelBtn) cancelBtn.innerHTML = "Close";

        const deleteBtn = dialogElement.querySelector(".customDeleteButton");
        if (deleteBtn) deleteBtn.disabled = true;

        const refreshPageButton = document.createElement("button");
        refreshPageButton.innerHTML = `<button class="btn relative btn-neutral customCancelButton" as="button"><div class="flex w-full gap-2 items-center justify-center">Refresh Page</div></button>`;
        refreshPageButton.onclick = () => {
          window.location.reload();
        };

        const buttonsContainer = dialogElement.querySelector("#customBulkDeleteButtons");
        if (buttonsContainer) {
          buttonsContainer.appendChild(refreshPageButton);
        }
      }
    };

    return Promise.all(deletePromises)
      .then(done)
      .catch((err) => {
        console.log(err);
        done();
        setDialogError("Error deleting chats. Please try again");
      });
  };

  const showDeleteDialog = () => {
    const inputs = document.querySelectorAll(".customCheckbox");
    inputs.forEach((input) => {
      input.disabled = true;
    });

    const dialogElement = document.createElement("div");
    dialogElement.setAttribute("id", "customDeleteDialog");

    let message = Object.keys(globalData.selectedChats).length === 0
      ? "No chats selected"
      : "This will delete the selected chats. Are you sure?";

    dialogElement.innerHTML = `
    <div role="dialog" class="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md left-1/2 -translate-x-1/2 p-4">
      <div class="border-b border-black/10 dark:border-white/10 pb-4">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-200">Delete chat?</h2>
      </div>
      <div class="py-4">
        ${message}
        <div id="customErrorDiv" class="my-2"></div>
        <br>
        <div style="overflow: auto; max-height: 30vh;">
           {SELECTED_CHATS}
        </div>
        <div class="mt-5 flex flex-col gap-3 sm:flex-row-reverse" id="customBulkDeleteButtons">
          <button class="customDeleteButton px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
          <button class="customCancelButton px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400">Cancel</button>
        </div>
      </div>
    </div>
    `;

    const formattedChatHTML = Object.values(globalData.selectedChats).map(
      (chat) => {
        return `<div id="custom${chat.id}"><strong>${chat.text}</strong></div>`;
      }
    );

    dialogElement.innerHTML = dialogElement.innerHTML.replace(
      "{SELECTED_CHATS}",
      formattedChatHTML.join("<br>")
    );

    const deleteSelectedChatsLocal = () => {
      if (!globalData.token) {
        getToken()
          .then(() => {
            if (globalData.tokenError) {
              setDialogError("Error getting token. Please try again");
            } else {
              deleteSelectedChats();
            }
          })
          .catch((err) => {
            setDialogError("Error getting token. Please try again");
          });
      } else {
        deleteSelectedChats();
      }
    };

    const modal = document.createElement("div");
    modal.setAttribute("id", "customDeleteDialogModal");
    modal.appendChild(dialogElement);
    modal.onclick = (event) => {
      if (!event.target.closest("#customDeleteDialog")) {
        closeDialog();
      }
    };
    modal.style = "position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;";
    document.body.appendChild(modal);

    dialogElement.querySelector(".customDeleteButton").onclick = deleteSelectedChatsLocal;
    dialogElement.querySelector(".customCancelButton").onclick = closeDialog;
  };

  const addCustomButtons = () => {
    const buttonsContainer = document.createElement("div");
    buttonsContainer.id = "customButtonsContainer";
    buttonsContainer.className = "flex gap-2 px-2 mb-2";

    buttonsContainer.innerHTML = `
  <div id="customOpenBulkDeleteDialog" class="cursor-pointer gradient-border-btn-red h-10 w-10">
    <div class="flex items-center justify-center h-full w-full rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300">
      <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" class="icon-sm" height="1em" width="1em">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </div>
  </div>
  <div id="customCheckAllButton" class="cursor-pointer gradient-border-btn-blue h-10 w-10">
    <div class="flex items-center justify-center h-full w-full rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300">
      <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" class="icon-sm" height="1em" width="1em">
        <path d="M5 12h14M5 16h14"></path>
      </svg>
    </div>
  </div>
    `;

    // More robust placement of buttons container
    const sidebarHeader = document.querySelector(".bg-token-bg-elevated-secondary");
    if (sidebarHeader) {
      const headerDiv = sidebarHeader.querySelector("div > div:first-child");
      if (headerDiv) {
        headerDiv.parentNode.insertBefore(buttonsContainer, headerDiv.nextSibling);
      }
    }

    document.getElementById("customOpenBulkDeleteDialog").onclick = showDeleteDialog;

    document.getElementById("customCheckAllButton").onclick = () => {
      // Check if any checkbox is unchecked
      const hasUnchecked = allInputElements.some(input =>
        !input.disabled && !input.checked
      );

      // Toggle all checkboxes
      allInputElements.forEach(input => {
        if (!input.disabled) {
          input.checked = hasUnchecked;

          // Manually trigger change event
          const event = new Event('change', {
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(event);
        }
      });
    };
  };

  const initializeIfNeeded = () => {
    if (!document.getElementById("customOpenBulkDeleteDialog")) {
      initGlobalData();
      addCustomButtons();
    }

    // Reset processing flags for all chats
    document.querySelectorAll('a[href*="/c/"]').forEach(chat => {
      delete chat.dataset.processed;
    });

    addCheckboxesToChatsIfNeeded();
  };

  const ready = () => {
    return document.querySelector('a[href*="/c/"]');
  };

  // MutationObserver to handle dynamic content
  const observer = new MutationObserver((mutations) => {
    let needsUpdate = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (
            node.matches('a[href*="/c/"]') ||
            node.querySelector('a[href*="/c/"]')
          )) {
            needsUpdate = true;
          }
        });
      }
    });

    if (needsUpdate) {
      initializeIfNeeded();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial check
  if (ready()) {
    initializeIfNeeded();
  } else {
    // If not ready, check again after a delay
    setTimeout(() => {
      if (ready()) {
        initializeIfNeeded();
      }
    }, 1000);
  }
})();
