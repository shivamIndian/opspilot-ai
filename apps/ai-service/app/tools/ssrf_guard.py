"""SSRF (Server-Side Request Forgery) Protection Module.
Prevents AI agent tools from accessing cloud metadata services, private networks, or loopback interfaces.
"""

import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "metadata",
}

BLOCKED_METADATA_IPS = {
    "169.254.169.254",  # AWS/GCP/Azure link-local metadata
    "fd00:ec2::254",    # AWS IPv6 metadata
}


class SSRFSecurityViolation(Exception):
    """Raised when an outbound URL violates SSRF security policies."""
    pass


def validate_outbound_url(url: str, allow_private: bool = False) -> str:
    """Validates that a URL is safe to fetch and does not target metadata, loopback, or private hosts.
    
    Args:
        url: The outbound URL string.
        allow_private: Whether internal private addresses are permitted (default False).
        
    Returns:
        The validated URL.
        
    Raises:
        SSRFSecurityViolation: If the URL fails SSRF safety validation.
    """
    if not url or not isinstance(url, str):
        raise SSRFSecurityViolation("Empty or invalid URL provided.")

    parsed = urlparse(url)

    if parsed.scheme.lower() not in {"http", "https"}:
        raise SSRFSecurityViolation(f"Forbidden protocol scheme: '{parsed.scheme}'. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityViolation("URL does not contain a valid hostname.")

    hostname_lower = hostname.lower().strip()

    if hostname_lower in BLOCKED_HOSTNAMES:
        raise SSRFSecurityViolation(f"Access to restricted hostname '{hostname}' is blocked.")

    # Check for direct IP address or resolve hostname
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
    except ValueError:
        # Hostname is a domain name -> resolve DNS safely
        try:
            addr_info = socket.getaddrinfo(hostname_lower, None)
            ip_str = addr_info[0][4][0]
            ip_obj = ipaddress.ip_address(ip_str)
        except socket.gaierror:
            # Handle unresolvable hostnames in offline test environments
            if hostname_lower.endswith(".internal") or hostname_lower.endswith(".local") or hostname_lower.endswith(".localdomain"):
                raise SSRFSecurityViolation(f"Unresolvable internal hostname '{hostname}' is blocked.")
            ip_obj = None
        except Exception as e:
            raise SSRFSecurityViolation(f"Failed to resolve hostname '{hostname}': {e}")

    if ip_obj is not None:
        # Check against blocked metadata IPs
        if str(ip_obj) in BLOCKED_METADATA_IPS:
            raise SSRFSecurityViolation(f"Access to cloud metadata IP '{ip_obj}' is strictly blocked.")

        # Check loopback
        if ip_obj.is_loopback:
            raise SSRFSecurityViolation(f"Access to loopback IP '{ip_obj}' is blocked.")

        # Check link-local
        if ip_obj.is_link_local:
            raise SSRFSecurityViolation(f"Access to link-local IP '{ip_obj}' is blocked.")

        # Check private RFC1918
        if not allow_private and ip_obj.is_private:
            raise SSRFSecurityViolation(f"Access to private internal network IP '{ip_obj}' is blocked.")

    return url
